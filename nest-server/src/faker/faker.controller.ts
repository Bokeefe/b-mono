import { Controller, Get } from '@nestjs/common';
import { FakerService } from './faker.service';

@Controller('api/faker')
export class FakerController {
  constructor(private readonly fakerService: FakerService) {}

  @Get('animals')
  getAnimals() {
    return this.fakerService.getAnimals(20);
  }

  @Get('animal')
  getAnimal() {
    return this.fakerService.getAnimal();
  }
}
