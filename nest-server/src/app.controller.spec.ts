import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthService } from './health/health.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, HealthService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the api payload', () => {
      expect(appController.getHello()).toEqual({ data: 'New response' });
    });
  });

  describe('health', () => {
    it('should report health with an ISO timestamp', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('health');
      expect(Date.parse(health.timestamp)).not.toBeNaN();
    });
  });
});
