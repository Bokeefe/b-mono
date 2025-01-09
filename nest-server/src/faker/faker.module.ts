import { Module } from '@nestjs/common';
import { FakerController } from './faker.controller';
import { FakerService } from './faker.service';

@Module({
  controllers: [FakerController],
  providers: [FakerService],
})
export class FakerModule {}
