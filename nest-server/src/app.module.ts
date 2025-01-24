import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { FakerModule } from './faker/faker.module';

@Module({
  imports: [FakerModule],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
