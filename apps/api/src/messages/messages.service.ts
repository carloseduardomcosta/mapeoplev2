import { Injectable, NotFoundException, Logger, forwardRef, Inject } from '@nestjs/common';
import { AuditEventType, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';

export interface ConversationPreview {
  peerId: string;
  peerName: string;
  peerEmail: string;
  peerImage: string | null;
  peerRole: string;
  lastMessage: {
    id: string;
    encryptedContent: string;
    iv: string;
    senderId: string;
    createdAt: Date;
    isRead: boolean;
  };
  unreadCount: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── Send a message ─────────────────────────────────────────────────────────

  async send(dto: SendMessageDto, sender: User, ipAddress?: string) {
    // Verify receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      select: { id: true, name: true, isActive: true },
    });

    if (!receiver || !receiver.isActive) {
      throw new NotFoundException('Destinatário não encontrado ou inativo.');
    }

    const message = await this.prisma.message.create({
      data: {
        senderId: sender.id,
        receiverId: dto.receiverId,
        encryptedContent: dto.encryptedContent,
        iv: dto.iv,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
        receiver: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.MESSAGE_SENT,
        userId: sender.id,
        ipAddress,
        metadata: {
          messageId: message.id,
          receiverId: dto.receiverId,
          receiverName: receiver.name,
        },
      },
    });

    this.logger.log(`[Chat] Message sent: ${sender.name} → ${receiver.name} (id: ${message.id})`);

    // ─── Emit via Socket.io in real-time ────────────────────────────────────
    // Deliver to receiver's room
    this.eventsGateway.emitToUser(dto.receiverId, 'chat:message', message);
    // Also emit back to sender so their own UI updates instantly (no polling needed)
    this.eventsGateway.emitToUser(sender.id, 'chat:message', message);

    this.logger.debug(`[Chat] Emitted chat:message to user:${dto.receiverId} and user:${sender.id}`);

    return message;
  }

  // ─── Get conversation messages with a specific peer ─────────────────────────

  async getConversation(userId: string, query: QueryMessagesDto) {
    const { peerId, limit = 50, before } = query;

    const where: Prisma.MessageWhereInput = {
      OR: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
    };

    // Cursor-based pagination
    if (before) {
      const cursorMessage = await this.prisma.message.findUnique({ where: { id: before } });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    this.logger.debug(`[Chat] Fetched ${messages.length} messages for conversation ${userId} <-> ${peerId}`);

    // Return in chronological order
    return messages.reverse();
  }

  // ─── Get all conversations (inbox) ──────────────────────────────────────────

  async getConversations(userId: string): Promise<ConversationPreview[]> {
    // Get all distinct peers the user has chatted with
    const sentTo = await this.prisma.message.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });

    const receivedFrom = await this.prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    const peerIds = [
      ...new Set([
        ...sentTo.map((m) => m.receiverId),
        ...receivedFrom.map((m) => m.senderId),
      ]),
    ];

    this.logger.debug(`[Chat] User ${userId} has ${peerIds.length} conversation(s)`);

    // Build conversation previews
    const conversations: ConversationPreview[] = [];

    for (const peerId of peerIds) {
      const [lastMessage, unreadCount, peer] = await Promise.all([
        // Last message in conversation
        this.prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: peerId },
              { senderId: peerId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Unread count (messages from peer to user that are unread)
        this.prisma.message.count({
          where: {
            senderId: peerId,
            receiverId: userId,
            isRead: false,
          },
        }),
        // Peer info
        this.prisma.user.findUnique({
          where: { id: peerId },
          select: { id: true, name: true, email: true, image: true, role: true },
        }),
      ]);

      if (!lastMessage || !peer) continue;

      conversations.push({
        peerId: peer.id,
        peerName: peer.name,
        peerEmail: peer.email,
        peerImage: peer.image,
        peerRole: peer.role,
        lastMessage: {
          id: lastMessage.id,
          encryptedContent: lastMessage.encryptedContent,
          iv: lastMessage.iv,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.isRead,
        },
        unreadCount,
      });
    }

    // Sort by last message date (most recent first)
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );

    return conversations;
  }

  // ─── Mark messages as read ──────────────────────────────────────────────────

  async markAsRead(userId: string, peerId: string) {
    const result = await this.prisma.message.updateMany({
      where: {
        senderId: peerId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    this.logger.debug(`[Chat] Marked ${result.count} messages as read (from ${peerId} to ${userId})`);

    // Notify sender that their messages were read
    if (result.count > 0) {
      this.eventsGateway.emitToUser(peerId, 'chat:read', { readBy: userId });
      this.logger.debug(`[Chat] Emitted chat:read to user:${peerId}`);
    }

    return { markedCount: result.count };
  }

  // ─── Get total unread count ─────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }

  // ─── Get list of all active users (for starting new conversations) ──────────

  async getActiveUsers(currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: currentUserId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
