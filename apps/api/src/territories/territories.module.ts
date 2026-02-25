import { Module } from '@nestjs/common';
import { TerritoriesController } from './territories.controller';
import { TerritoriesService } from './territories.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [TerritoriesController],
  providers: [TerritoriesService, RolesGuard],
})
export class TerritoriesModule {}
