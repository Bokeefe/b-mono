import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FakerModule } from './faker/faker.module';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { LunchModule } from './lunch/lunch.module';

@Module({
  imports: [
    FakerModule,
    LunchModule
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
