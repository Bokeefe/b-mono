import { Module } from '@nestjs/common';
import { ClaimjumpersController } from './claimjumpers.controller';
import { ClaimjumpersService } from './claimjumpers.service';

@Module({
  controllers: [ClaimjumpersController],
  providers: [ClaimjumpersService],
})
export class ClaimjumpersModule {}
