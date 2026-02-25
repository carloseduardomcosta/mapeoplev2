import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, AuditEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── List all users (admin) ───────────────────────────────────────────────

  async findAll(query: QueryUsersDto) {
    const { search, role, isActive } = query;

    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdResidents: true,
            auditLogs: true,
            territorySessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`[Users] Query returned ${users.length} users`);
    return users;
  }

  // ─── Get single user details ──────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdResidents: true,
            auditLogs: true,
            territorySessions: true,
            sentMessages: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  // ─── Update user (admin) ─────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        eventType: AuditEventType.STATUS_CHANGED,
        metadata: {
          action: 'user_updated',
          targetUserId: id,
          targetUserName: user.name,
          changes: JSON.parse(JSON.stringify(dto)),
        },
      },
    });

    this.logger.log(`[Users] Admin ${adminId} updated user ${id}: ${JSON.stringify(dto)}`);
    return updated;
  }

  // ─── Get stats ────────────────────────────────────────────────────────────

  async getStats() {
    const [total, active, inactive, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count.id })),
    };
  }
}
