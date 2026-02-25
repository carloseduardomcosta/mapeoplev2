import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ResidentsModule } from './residents/residents.module';
import { InvitesModule } from './invites/invites.module';
import { TerritoriesModule } from './territories/territories.module';
import { EventsModule } from './events/events.module';
import { MessagesModule } from './messages/messages.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,       // @Global — PrismaService disponível em todo o app
    RedisModule,        // @Global — RedisService disponível em todo o app
    AuthModule,
    ResidentsModule,
    InvitesModule,
    TerritoriesModule,
    EventsModule,       // WebSocket gateway — presença, chat, localização
    MessagesModule,     // Chat REST endpoints + real-time via EventsGateway
    AuditModule,        // Audit log viewer (admin only)
    UsersModule,        // User management (admin only)
  ],
  controllers: [AppController],
})
export class AppModule {}
