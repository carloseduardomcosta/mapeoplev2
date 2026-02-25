import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ─── POST /api/messages — Send a message ──────────────────────────────────
  // Real-time delivery is handled inside MessagesService via EventsGateway
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.messagesService.send(dto, user, req.ip);
  }

  // ─── GET /api/messages/conversations — List all conversations ─────────────
  @Get('conversations')
  getConversations(@CurrentUser() user: User) {
    return this.messagesService.getConversations(user.id);
  }

  // ─── GET /api/messages/conversation — Get messages with a peer ────────────
  @Get('conversation')
  getConversation(
    @CurrentUser() user: User,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.getConversation(user.id, query);
  }

  // ─── PATCH /api/messages/read/:peerId — Mark messages as read ─────────────
  // Real-time read receipt is handled inside MessagesService via EventsGateway
  @Patch('read/:peerId')
  markAsRead(
    @CurrentUser() user: User,
    @Param('peerId') peerId: string,
  ) {
    return this.messagesService.markAsRead(user.id, peerId);
  }

  // ─── GET /api/messages/unread — Get total unread count ────────────────────
  @Get('unread')
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.messagesService.getUnreadCount(user.id);
    return { unreadCount: count };
  }

  // ─── GET /api/messages/users — List active users for new conversations ────
  @Get('users')
  getActiveUsers(@CurrentUser() user: User) {
    return this.messagesService.getActiveUsers(user.id);
  }
}
