import { Controller, Get, Param } from '@nestjs/common';
import { SlomoService } from './slomo.service';

@Controller('/api/slomo')
export class SlomoController {
  constructor(private readonly slomoService: SlomoService) {}

  @Get('/genres')
  getGenres() {
    return this.slomoService.getGenres();
  }

  @Get('/genres/:genre/tracks')
  getTracks(@Param('genre') genre: string) {
    return this.slomoService.getTracks(genre);
  }
}

