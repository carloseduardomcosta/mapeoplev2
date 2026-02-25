import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role, User } from '@prisma/client';
import { TerritoriesService } from './territories.service';
import { CreateTerritoryDto } from './dto/create-territory.dto';
import { UpdateTerritoryDto } from './dto/update-territory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  // ─── GET /api/territories ──────────────────────────────────────────────────
  @Get()
  findAll() {
    return this.territoriesService.findAll();
  }

  // ─── GET /api/territories/active-sessions ─────────────────────────────────
  @Get('active-sessions')
  findActiveSessions() {
    return this.territoriesService.findActiveSessions();
  }

  // ─── GET /api/territories/:id ──────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.territoriesService.findOne(id);
  }

  // ─── POST /api/territories ─────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(
    @Body() dto: CreateTerritoryDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.territoriesService.create(dto, user, req.ip);
  }

  // ─── PATCH /api/territories/:id ────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTerritoryDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.territoriesService.update(id, dto, user, req.ip);
  }

  // ─── DELETE /api/territories/:id ───────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.territoriesService.remove(id, user, req.ip);
  }

  // ─── POST /api/territories/:id/start-session ───────────────────────────────
  @Post(':id/start-session')
  @HttpCode(HttpStatus.CREATED)
  startSession(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.territoriesService.startSession(id, user, req.ip);
  }

  // ─── POST /api/territories/:id/end-session ─────────────────────────────────
  @Post(':id/end-session')
  @HttpCode(HttpStatus.NO_CONTENT)
  endSession(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.territoriesService.endSession(id, user, req.ip);
  }
}
