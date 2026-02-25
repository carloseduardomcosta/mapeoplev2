import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [InvitesController],
  providers: [InvitesService, RolesGuard],
})
export class InvitesModule {}
