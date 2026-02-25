import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private ensureAdmin(user: User) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem gerenciar usuários.');
    }
  }

  // ─── GET /api/users — List all users ──────────────────────────────────────
  @Get()
  findAll(@CurrentUser() user: User, @Query() query: QueryUsersDto) {
    this.ensureAdmin(user);
    return this.usersService.findAll(query);
  }

  // ─── GET /api/users/stats — User statistics ───────────────────────────────
  @Get('stats')
  getStats(@CurrentUser() user: User) {
    this.ensureAdmin(user);
    return this.usersService.getStats();
  }

  // ─── GET /api/users/:id — Get single user ────────────────────────────────
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    this.ensureAdmin(user);
    return this.usersService.findOne(id);
  }

  // ─── PATCH /api/users/:id — Update user role/status ───────────────────────
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    this.ensureAdmin(user);
    return this.usersService.update(id, dto, user.id);
  }
}
