import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ─── GET /api/audit — List audit logs (ADMIN only) ────────────────────────
  @Get()
  findAll(@CurrentUser() user: User, @Query() query: QueryAuditDto) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem acessar os logs de auditoria.');
    }
    return this.auditService.findAll(query);
  }

  // ─── GET /api/audit/stats — Audit statistics (ADMIN only) ─────────────────
  @Get('stats')
  getStats(@CurrentUser() user: User) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem acessar as estatísticas.');
    }
    return this.auditService.getStats();
  }

  // ─── GET /api/audit/users — Distinct users in audit logs (ADMIN only) ─────
  @Get('users')
  getDistinctUsers(@CurrentUser() user: User) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem acessar esta informação.');
    }
    return this.auditService.getDistinctUsers();
  }
}
