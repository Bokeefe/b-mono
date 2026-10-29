import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClaimjumpersModule } from './claimjumpers/claimjumpers.module';
import { FakerModule } from './faker/faker.module';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { LunchModule } from './lunch/lunch.module';
import { PlantingCalendarModule } from './planting-calendar/planting-calendar.module';
import { TextCorpseModule } from './text-corpse/text-corpse.module';
import { SlomoModule } from './slomo/slomo.module';

@Module({
  imports: [
    FakerModule,
    LunchModule,
    TextCorpseModule,
    SlomoModule,
    ClaimjumpersModule,
    PlantingCalendarModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
