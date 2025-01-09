import { Test, TestingModule } from '@nestjs/testing';
import { FakerController } from './faker.controller';

describe('FakerController', () => {
  let controller: FakerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FakerController],
    }).compile();

    controller = module.get<FakerController>(FakerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
