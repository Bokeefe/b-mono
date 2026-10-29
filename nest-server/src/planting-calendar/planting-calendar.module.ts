import { Module } from '@nestjs/common';
import { PlantingCalendarController } from './planting-calendar.controller';
import { PlantingCalendarService } from './planting-calendar.service';

@Module({
  controllers: [PlantingCalendarController],
  providers: [PlantingCalendarService],
})
export class PlantingCalendarModule {}
