import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Role, User } from '@prisma/client';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { QueryResidentDto } from './dto/query-resident.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('residents')
@UseGuards(JwtAuthGuard)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  // ─── GET /api/residents ────────────────────────────────────────────────────
  @Get()
  findAll(@Query() query: QueryResidentDto) {
    return this.residentsService.findAll(query);
  }

  // ─── GET /api/residents/export/csv — Export residents as CSV ──────────────
  @Get('export/csv')
  async exportCsv(@CurrentUser() user: User, @Req() req: Request, @Res() res: Response) {
    const csv = await this.residentsService.exportCsv(user, req.ip);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=moradores-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }

  // ─── GET /api/residents/:id ────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.residentsService.findOne(id);
  }

  // ─── POST /api/residents ───────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateResidentDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.residentsService.create(dto, user, req.ip);
  }

  // ─── PATCH /api/residents/:id ──────────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.residentsService.update(id, dto, user, req.ip);
  }

  // ─── DELETE /api/residents/:id ─────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.residentsService.remove(id, user, req.ip);
  }
}
