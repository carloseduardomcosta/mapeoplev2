import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditEventType, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';
import { UpdateTerritoryDto } from './dto/update-territory.dto';

@Injectable()
export class TerritoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET /territories ─────────────────────────────────────────────────────

  async findAll() {
    const territories = await this.prisma.territory.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
      include: {
        sessions: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          take: 1,
        },
      },
    });

    return territories.map((t) => ({
      ...t,
      activeSession: t.sessions[0] ?? null,
      sessions: undefined,
    }));
  }

  // ─── GET /territories/active-sessions ─────────────────────────────────────

  async findActiveSessions() {
    return this.prisma.territorySession.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        territory: { select: { id: true, number: true, name: true, color: true } },
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  // ─── GET /territories/:id ─────────────────────────────────────────────────

  async findOne(id: string) {
    const territory = await this.prisma.territory.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!territory) throw new NotFoundException(`Território ${id} não encontrado.`);
    return territory;
  }

  // ─── POST /territories ────────────────────────────────────────────────────

  async create(dto: CreateTerritoryDto, user: User, ipAddress?: string) {
    const exists = await this.prisma.territory.findUnique({ where: { number: dto.number } });
    if (exists) throw new BadRequestException(`Território número ${dto.number} já existe.`);

    const territory = await this.prisma.territory.create({
      data: {
        number: dto.number,
        name: dto.name,
        description: dto.description,
        polygon: dto.polygon as unknown as object[],
        color: dto.color ?? '#4488FF',
        createdById: user.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.TERRITORY_CREATED,
        userId: user.id,
        ipAddress,
        metadata: { territoryId: territory.id, number: territory.number, name: territory.name },
      },
    });

    return territory;
  }

  // ─── PATCH /territories/:id ───────────────────────────────────────────────

  async update(id: string, dto: UpdateTerritoryDto, user: User, ipAddress?: string) {
    const territory = await this.prisma.territory.findUnique({ where: { id } });
    if (!territory) throw new NotFoundException(`Território ${id} não encontrado.`);

    if (dto.number && dto.number !== territory.number) {
      const exists = await this.prisma.territory.findUnique({ where: { number: dto.number } });
      if (exists) throw new BadRequestException(`Território número ${dto.number} já existe.`);
    }

    const updated = await this.prisma.territory.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.polygon !== undefined && { polygon: dto.polygon as unknown as object[] }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.TERRITORY_UPDATED,
        userId: user.id,
        ipAddress,
        metadata: { territoryId: id, changes: dto as object },
      },
    });

    return updated;
  }

  // ─── DELETE /territories/:id ──────────────────────────────────────────────

  async remove(id: string, user: User, ipAddress?: string): Promise<void> {
    const territory = await this.prisma.territory.findUnique({ where: { id } });
    if (!territory) throw new NotFoundException(`Território ${id} não encontrado.`);

    // Encerra sessões ativas antes de deletar
    await this.prisma.territorySession.updateMany({
      where: { territoryId: id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    await this.prisma.territory.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.TERRITORY_DELETED,
        userId: user.id,
        ipAddress,
        metadata: { territoryId: id, number: territory.number, name: territory.name },
      },
    });
  }

  // ─── POST /territories/:id/start-session ──────────────────────────────────

  async startSession(id: string, user: User, ipAddress?: string) {
    const territory = await this.prisma.territory.findUnique({ where: { id } });
    if (!territory) throw new NotFoundException(`Território ${id} não encontrado.`);

    // Encerra sessão ativa do usuário em qualquer território
    await this.prisma.territorySession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    const session = await this.prisma.territorySession.create({
      data: {
        territoryId: id,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        territory: { select: { id: true, number: true, name: true, color: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.TERRITORY_SESSION_STARTED,
        userId: user.id,
        ipAddress,
        metadata: { sessionId: session.id, territoryId: id, number: territory.number },
      },
    });

    return session;
  }

  // ─── POST /territories/:id/end-session ────────────────────────────────────

  async endSession(id: string, user: User, ipAddress?: string): Promise<void> {
    const session = await this.prisma.territorySession.findFirst({
      where: { territoryId: id, userId: user.id, isActive: true },
    });
    if (!session) throw new NotFoundException('Nenhuma sessão ativa encontrada para este território.');

    await this.prisma.territorySession.update({
      where: { id: session.id },
      data: { isActive: false, endedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.TERRITORY_SESSION_ENDED,
        userId: user.id,
        ipAddress,
        metadata: { sessionId: session.id, territoryId: id },
      },
    });
  }
}
