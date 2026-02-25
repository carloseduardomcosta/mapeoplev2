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
import { EventsGateway } from '../events/events.gateway';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ─── POST /api/messages — Send a message ──────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const message = await this.messagesService.send(dto, user, req.ip);

    // Emit real-time event to receiver
    this.eventsGateway.emitToUser(dto.receiverId, 'chat:message', message);

    // Also emit to sender (for multi-tab sync)
    this.eventsGateway.emitToUser(user.id, 'chat:message', message);

    return message;
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
  @Patch('read/:peerId')
  async markAsRead(
    @CurrentUser() user: User,
    @Param('peerId') peerId: string,
  ) {
    const result = await this.messagesService.markAsRead(user.id, peerId);

    // Notify the peer that their messages were read
    this.eventsGateway.emitToUser(peerId, 'chat:read', {
      readBy: user.id,
      peerId: user.id,
    });

    return result;
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
