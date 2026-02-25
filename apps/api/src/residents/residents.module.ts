import { Module } from '@nestjs/common';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [ResidentsController],
  providers: [ResidentsService, RolesGuard],
})
export class ResidentsModule {}
