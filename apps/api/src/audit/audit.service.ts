import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get paginated audit logs with filters ──────────────────────────────────

  async findAll(query: QueryAuditDto) {
    const { page = 1, limit = 50, eventType, userId, search, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (eventType) {
      where.eventType = eventType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { resident: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
          resident: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    this.logger.debug(`[Audit] Query returned ${data.length} of ${total} logs (page ${page})`);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get audit stats (for dashboard) ────────────────────────────────────────

  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalToday, totalWeek, totalAll, byType] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['eventType'],
        _count: { id: true },
        where: { createdAt: { gte: weekAgo } },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      totalToday,
      totalWeek,
      totalAll,
      byType: byType.map((item) => ({
        eventType: item.eventType,
        count: item._count.id,
      })),
    };
  }

  // ─── Get distinct users who have audit logs ─────────────────────────────────

  async getDistinctUsers() {
    const users = await this.prisma.auditLog.findMany({
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
      distinct: ['userId'],
      orderBy: { createdAt: 'desc' },
    });

    return users.map((entry) => entry.user);
  }
}
