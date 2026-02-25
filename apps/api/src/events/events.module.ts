import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    JwtModule.register({}), // Secret is provided at verify() time
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
