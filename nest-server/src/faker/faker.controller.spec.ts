import { Test, TestingModule } from '@nestjs/testing';
import { FakerController } from './faker.controller';
import { FakerService } from './faker.service';

describe('FakerController', () => {
  let controller: FakerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FakerController],
      providers: [FakerService],
    }).compile();

    controller = module.get<FakerController>(FakerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 20 animal names', () => {
    const animals = controller.getAnimals();

    expect(animals).toHaveLength(20);
    animals.forEach((animal) => expect(typeof animal).toBe('string'));
  });

  it('should return a single animal for the requested name', () => {
    const animal = controller.getAnimal('otter');

    expect(animal.name).toBe('otter');
    expect(animal.age).toBeGreaterThanOrEqual(1);
    expect(animal.age).toBeLessThanOrEqual(100);
  });
});
