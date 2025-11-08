import { Module } from '@nestjs/common';
import { TextCorpseGateway } from './text-corpse.gateway';
import { TextCorpseService } from './text-corpse.service';

@Module({
  providers: [TextCorpseGateway, TextCorpseService],
})
export class TextCorpseModule {}
