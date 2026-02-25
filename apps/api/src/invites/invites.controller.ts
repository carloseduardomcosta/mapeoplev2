import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role, User } from '@prisma/client';
import { InvitesService } from './invites.service';
import { SendInviteDto } from './dto/send-invite.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  // ─── POST /api/invites/send ────────────────────────────────────────────────
  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  sendInvite(
    @Body() dto: SendInviteDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.invitesService.sendInvite(dto, user, req.ip);
  }

  // ─── GET /api/invites/accept/:token ───────────────────────────────────────
  // Rota pública — sem autenticação
  @Get('accept/:token')
  acceptInvite(@Param('token') token: string) {
    return this.invitesService.acceptInvite(token);
  }

  // ─── GET /api/invites/pending ──────────────────────────────────────────────
  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listPending() {
    return this.invitesService.listPending();
  }

  // ─── PATCH /api/invites/:userId/approve ───────────────────────────────────
  @Patch(':userId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approveUser(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.invitesService.approveUser(userId, user, req.ip);
  }

  // ─── PATCH /api/invites/:userId/role ──────────────────────────────────────
  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  changeRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.invitesService.changeRole(userId, dto, user, req.ip);
  }
}
