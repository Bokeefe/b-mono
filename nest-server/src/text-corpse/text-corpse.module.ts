import { Module } from '@nestjs/common';
import { TextCorpseController } from './text-corpse.controller';
import { TextCorpseGateway } from './text-corpse.gateway';
import { TextCorpseService } from './text-corpse.service';

@Module({
  controllers: [TextCorpseController],
  providers: [TextCorpseGateway, TextCorpseService],
})
export class TextCorpseModule {}
