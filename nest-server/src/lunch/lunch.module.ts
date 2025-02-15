import { Module } from '@nestjs/common';
import { LunchGateway } from './lunch.gateway';

@Module({
  providers: [LunchGateway]
})
export class LunchModule {} 