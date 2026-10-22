import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ClaimjumpersService } from './claimjumpers.service';

@Controller('api/claimjumpers')
export class ClaimjumpersController {
  constructor(private readonly claimjumpersService: ClaimjumpersService) {}

  // curl -X GET "http://localhost:4171/api/claimjumpers" -H "Accept: application/json"
  @Get()
  async listAudioFiles(): Promise<string[]> {
    return this.claimjumpersService.getAudioFiles();
  }

  // curl -X GET "http://localhost:4171/api/claimjumpers/01%20Tides%20Comin%20In.mp3" --output track.mp3
  @Get(':filename')
  getAudioFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.claimjumpersService.getAudioFilePath(filename);

    // sendFile streams the mp3 (and honours Range requests) so the browser can
    // seek inside the track instead of receiving a JSON-serialised Buffer
    return res.sendFile(filePath);
  }
}
