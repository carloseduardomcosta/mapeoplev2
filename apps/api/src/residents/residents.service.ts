import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditEventType, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ResidentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET /residents ───────────────────────────────────────────────────────

  async findAll(query: QueryResidentDto): Promise<PaginatedResult<Prisma.ResidentGetPayload<{
    include: { createdBy: { select: { id: true; name: true; email: true } } };
  }>>> {
    const { page, limit, status, search } = query;

    const where: Prisma.ResidentWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.resident.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── GET /residents/:id ───────────────────────────────────────────────────

  async findOne(id: string) {
    const resident = await this.prisma.resident.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!resident) throw new NotFoundException(`Morador ${id} não encontrado.`);
    return resident;
  }

  // ─── POST /residents ──────────────────────────────────────────────────────

  async create(dto: CreateResidentDto, user: User, ipAddress?: string) {
    const resident = await this.prisma.resident.create({
      data: {
        fullName: dto.fullName,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        phone: dto.phone,
        notes: dto.notes,
        status: dto.status,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
        createdById: user.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.RESIDENT_CREATED,
        userId: user.id,
        residentId: resident.id,
        ipAddress,
        metadata: { fullName: resident.fullName, address: resident.address },
      },
    });

    return resident;
  }

  // ─── PATCH /residents/:id ─────────────────────────────────────────────────

  async update(id: string, dto: UpdateResidentDto, user: User, ipAddress?: string) {
    const resident = await this.prisma.resident.findUnique({ where: { id } });
    if (!resident) throw new NotFoundException(`Morador ${id} não encontrado.`);

    // Apenas ADMIN pode editar qualquer morador; demais roles só os próprios
    if (user.role !== Role.ADMIN && resident.createdById !== user.id) {
      throw new ForbiddenException('Você só pode editar moradores que cadastrou.');
    }

    const statusChanged = dto.status !== undefined && dto.status !== resident.status;
    const previousStatus = resident.status;

    const updated = await this.prisma.resident.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.visitDate !== undefined && { visitDate: new Date(dto.visitDate) }),
        updatedById: user.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.RESIDENT_UPDATED,
        userId: user.id,
        residentId: id,
        ipAddress,
        metadata: { changes: dto } as unknown as Prisma.InputJsonValue,
      },
    });

    if (statusChanged) {
      await this.prisma.auditLog.create({
        data: {
          eventType: AuditEventType.STATUS_CHANGED,
          userId: user.id,
          residentId: id,
          ipAddress,
          metadata: { from: previousStatus, to: dto.status },
        },
      });
    }

    return updated;
  }

  // ─── CSV Export ───────────────────────────────────────────────────────

  async exportCsv(user: User, ipAddress?: string): Promise<string> {
    const residents = await this.prisma.resident.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const STATUS_MAP: Record<string, string> = {
      NAO_VISITADO: 'Não Visitado',
      REVISITA: 'Revisita',
      ESTUDO: 'Estudo Bíblico',
      NAO_BATER: 'Não Bater',
      AUSENTE: 'Ausente',
      MUDOU: 'Mudou',
    };

    const header = 'Nome,Endereço,Telefone,Status,Observações,Cadastrado por,Data Cadastro';
    const rows = residents.map((r) => {
      const escape = (s: string | null) => {
        if (!s) return '';
        return '"' + s.replace(/"/g, '""') + '"';
      };
      return [
        escape(r.fullName),
        escape(r.address),
        escape(r.phone),
        STATUS_MAP[r.status] ?? r.status,
        escape(r.notes),
        escape(r.createdBy?.name ?? ''),
        r.createdAt.toLocaleDateString('pt-BR'),
      ].join(',');
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.DATA_EXPORTED,
        userId: user.id,
        ipAddress,
        metadata: { format: 'csv', count: residents.length },
      },
    });

    return [header, ...rows].join('\n');
  }

  // ─── DELETE /residents/:id ────────────────────────────────────────────────

  async remove(id: string, user: User, ipAddress?: string): Promise<void> {
    const resident = await this.prisma.resident.findUnique({ where: { id } });
    if (!resident) throw new NotFoundException(`Morador ${id} não encontrado.`);

    // Desvincula AuditLogs antes de deletar (SET NULL via onDelete: SetNull no schema)
    await this.prisma.resident.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        eventType: AuditEventType.RESIDENT_DELETED,
        userId: user.id,
        ipAddress,
        metadata: { deletedId: id, fullName: resident.fullName },
      },
    });
  }
}
