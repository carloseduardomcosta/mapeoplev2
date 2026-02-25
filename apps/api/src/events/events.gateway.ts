import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// Redis keys
const ONLINE_USERS_KEY = 'online_users';
const SOCKET_MAP_KEY = 'socket_user_map'; // socketId → userId
const USER_SOCKETS_KEY = 'user_sockets';  // userId → Set<socketId>
const ACTIVE_LOCATIONS_KEY = 'active_locations'; // userId → LocationData

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  connectedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Connection handler ─────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    this.logger.log(`[WS] Client attempting connection: ${client.id}`);

    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`[WS] No token provided by ${client.id} — disconnecting`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, image: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`[WS] User not found or inactive: ${payload.sub} — disconnecting`);
        client.disconnect(true);
        return;
      }

      // Store user data on socket instance
      (client as any).userId = user.id;
      (client as any).userData = user;

      // Join user-specific room for targeted messages
      client.join(`user:${user.id}`);

      // Track in Redis
      await this.redis.hset(SOCKET_MAP_KEY, client.id, user.id);
      await this.redis.sadd(`${USER_SOCKETS_KEY}:${user.id}`, client.id);

      // Add to online users set with user data
      const onlineUser: OnlineUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        connectedAt: new Date().toISOString(),
      };
      await this.redis.hset(ONLINE_USERS_KEY, user.id, JSON.stringify(onlineUser));

      // Broadcast updated online users list
      const onlineUsers = await this.getOnlineUsers();
      this.server.emit('users:online', onlineUsers);

      this.logger.log(`[WS] ✓ ${user.name} (${user.email}) connected — socket: ${client.id} — online: ${onlineUsers.length}`);
    } catch (err) {
      this.logger.warn(`[WS] Auth failed for ${client.id}: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  // ─── Disconnection handler ──────────────────────────────────────────────────

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    const userName = (client as any).userData?.name ?? 'unknown';

    this.logger.log(`[WS] Client disconnected: ${client.id} (user: ${userName})`);

    if (!userId) return;

    try {
      // Remove this socket from tracking
      await this.redis.hdel(SOCKET_MAP_KEY, client.id);
      await this.redis.srem(`${USER_SOCKETS_KEY}:${userId}`, client.id);

      // Check if user has other active sockets
      const remainingSockets = await this.redis.smembers(`${USER_SOCKETS_KEY}:${userId}`);
      if (remainingSockets.length === 0) {
        // User is fully offline — remove from online users and location
        await this.redis.hdel(ONLINE_USERS_KEY, userId);
        await this.redis.hdel(ACTIVE_LOCATIONS_KEY, userId);
        this.server.emit('location:removed', { userId });
        this.logger.log(`[WS] ${userName} is now offline (no remaining sockets)`);
      } else {
        this.logger.log(`[WS] ${userName} still has ${remainingSockets.length} active socket(s)`);
      }

      // Broadcast updated online users list
      const onlineUsers = await this.getOnlineUsers();
      this.server.emit('users:online', onlineUsers);
    } catch (err) {
      this.logger.error(`[WS] Error during disconnect cleanup: ${(err as Error).message}`);
    }
  }

  // ─── Ping/Pong for keepalive ────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // ─── Request online users list ──────────────────────────────────────────────

  @SubscribeMessage('users:list')
  async handleUsersList(@ConnectedSocket() client: Socket) {
    const onlineUsers = await this.getOnlineUsers();
    client.emit('users:online', onlineUsers);
  }

  // ─── Typing indicator ───────────────────────────────────────────────────────

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string },
  ) {
    const userId = (client as any).userId;
    const userName = (client as any).userData?.name;
    if (!userId || !data.receiverId) return;

    this.server.to(`user:${data.receiverId}`).emit('chat:typing', {
      userId,
      name: userName,
    });
  }

  @SubscribeMessage('chat:stop-typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId || !data.receiverId) return;

    this.server.to(`user:${data.receiverId}`).emit('chat:stop-typing', {
      userId,
    });
  }

  // ─── Location sharing ────────────────────────────────────────────────────────

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; accuracy?: number },
  ) {
    const userId = (client as any).userId;
    const userData = (client as any).userData;
    if (!userId || !data.lat || !data.lng) return;

    const locationData = {
      userId,
      name: userData?.name ?? 'Desconhecido',
      image: userData?.image ?? null,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? 0,
      updatedAt: new Date().toISOString(),
    };

    // Store in Redis
    await this.redis.hset(ACTIVE_LOCATIONS_KEY, userId, JSON.stringify(locationData));

    // Broadcast to all connected clients
    this.server.emit('location:updated', locationData);

    this.logger.debug(`[WS] Location update from ${userData?.name}: ${data.lat}, ${data.lng}`);
  }

  @SubscribeMessage('location:stop')
  async handleLocationStop(@ConnectedSocket() client: Socket) {
    const userId = (client as any).userId;
    const userName = (client as any).userData?.name ?? 'unknown';
    if (!userId) return;

    await this.redis.hdel(ACTIVE_LOCATIONS_KEY, userId);
    this.server.emit('location:removed', { userId });

    this.logger.log(`[WS] ${userName} stopped sharing location`);
  }

  @SubscribeMessage('location:list')
  async handleLocationList(@ConnectedSocket() client: Socket) {
    const locations = await this.getActiveLocations();
    client.emit('location:all', locations);
  }

  // ─── Helper: Get all active locations ───────────────────────────────────────

  async getActiveLocations(): Promise<any[]> {
    const raw = await this.redis.hgetall(ACTIVE_LOCATIONS_KEY);
    return Object.values(raw).map((json) => JSON.parse(json));
  }

  // ─── Helper: Get all online users ───────────────────────────────────────────

  async getOnlineUsers(): Promise<OnlineUser[]> {
    const raw = await this.redis.hgetall(ONLINE_USERS_KEY);
    return Object.values(raw).map((json) => JSON.parse(json));
  }

  // ─── Helper: Emit to specific user ─────────────────────────────────────────

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── Helper: Broadcast to all ───────────────────────────────────────────────

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ─── Helper: Extract JWT from handshake ─────────────────────────────────────

  private extractToken(client: Socket): string | null {
    // Try auth header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Try query parameter
    const queryToken = client.handshake.query.token as string | undefined;
    if (queryToken) return queryToken;

    // Try cookie
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/auth_token=([^;]+)/);
      if (match) return match[1];
    }

    return null;
  }
}
