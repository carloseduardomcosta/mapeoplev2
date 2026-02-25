import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ResidentsModule } from './residents/residents.module';
import { InvitesModule } from './invites/invites.module';
import { TerritoriesModule } from './territories/territories.module';
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
  ],
  controllers: [AppController],
})
export class AppModule {}
