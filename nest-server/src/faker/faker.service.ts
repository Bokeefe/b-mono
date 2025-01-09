import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class FakerService {
  getAnimal() {
    return {
      name: faker.animal.type(),
      age: faker.number.int({ min: 1, max: 100 }),
      color: faker.color.human(),
    };
  }

  getAnimals(count: number) {
    return Array.from({ length: count }, faker.animal.type);
  }
}
