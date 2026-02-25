import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditEventType, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 dias em segundos

interface GoogleUserData {
  googleId: string;
  email: string;
  name: string;
  image?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'image' | 'role'>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  // ─── Chamado pela GoogleStrategy ─────────────────────────────────────────

  async validateGoogleUser(data: GoogleUserData): Promise<User> {
    const { googleId, email, name, image } = data;

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const isAdminEmail = email === adminEmail;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId,
          email,
          name,
          image,
          // Admin email é aprovado e recebe role ADMIN automaticamente
          isActive: isAdminEmail,
          role: isAdminEmail ? Role.ADMIN : Role.VOLUNTARIO,
        },
      });
      this.logger.log(`Novo usuário criado: ${email} (ativo: ${user.isActive})`);
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId, image },
      });
    }

    return user;
  }

  // ─── Finaliza o login após callback do Google ─────────────────────────────

  async login(user: User, ipAddress?: string): Promise<TokenPair> {
    if (!user.isActive) {
      await this.audit(user.id, AuditEventType.ACCESS_DENIED, ipAddress, {
        reason: 'Conta não aprovada',
      });
      throw new ForbiddenException(
        'Conta ainda não aprovada. Aguarde o convite de acesso.',
      );
    }

    const tokens = await this.generateTokens(user);
    await this.audit(user.id, AuditEventType.LOGIN, ipAddress);

    return tokens;
  }

  // ─── Renova o access token via refresh token ──────────────────────────────

  async refresh(incomingRefreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };

    try {
      payload = this.jwtService.verify(incomingRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const stored = await this.redis.get(`rt:${payload.sub}`);
    if (!stored || stored !== incomingRefreshToken) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    return this.generateTokens(user);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, ipAddress?: string): Promise<void> {
    await this.redis.del(`rt:${userId}`);
    await this.audit(userId, AuditEventType.LOGOUT, ipAddress);
  }

  // ─── Retorna dados do usuário autenticado ─────────────────────────────────

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async generateTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Um refresh token por usuário — nova sessão invalida a anterior
    await this.redis.set(`rt:${user.id}`, refreshToken, REFRESH_TTL);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role },
    };
  }

  private async audit(
    userId: string,
    eventType: AuditEventType,
    ipAddress?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { userId, eventType, ipAddress, metadata },
    });
  }
}
