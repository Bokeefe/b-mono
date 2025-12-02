import { Module } from '@nestjs/common';
import { SlomoController } from './slomo.controller';
import { SlomoService } from './slomo.service';

@Module({
  controllers: [SlomoController],
  providers: [SlomoService],
})
export class SlomoModule {}

