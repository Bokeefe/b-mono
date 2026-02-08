import { Controller, Get, Param } from '@nestjs/common';
import { FakerService } from './faker.service';

@Controller('api/faker')
export class FakerController {
  constructor(private readonly fakerService: FakerService) {}

  @Get('animals')
  getAnimals() {
    return this.fakerService.getAnimals(20);
  }

  @Get('animal/:name')
  getAnimal(@Param('name') name: string) {
    return this.fakerService.getAnimal(name);
  }
}
