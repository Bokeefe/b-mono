import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthService } from './health/health.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Get('api')
  getHello(): { data: string } {
    return this.appService.getHello();
  }

  @Get('api/health')
  getHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}
