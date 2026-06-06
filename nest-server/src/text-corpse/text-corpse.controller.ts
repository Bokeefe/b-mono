import { Controller, Get, Res, Query, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { TextCorpseService } from './text-corpse.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('backup')
export class TextCorpseController {
  constructor(private readonly textCorpseService: TextCorpseService) {}

  @Get()
  async downloadBackup(
    @Query('password') password: string, // Accesses ?password=...
    @Res() res: Response
  ) {
    // 1. Security Check
    const secretKey = process.env.UNIVERSAL_CELL_UNLOCK;

    if (!password || password !== secretKey) {
      // We use Nest's built-in exceptions for cleaner responses
      throw new UnauthorizedException('Invalid or missing backup password');
    }

    try {
      const filePath = this.textCorpseService.getDataFilePath();

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Backup file not found on server');
      }

      const fileName = `text-corpse-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // 2. Stream the file for better performance
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      return res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('[TextCorpseController] Error:', error);
      
      // If headers haven't been sent, we can still send a JSON error
      if (!res.headersSent) {
        throw new InternalServerErrorException('Failed to process backup download');
      }
    }
  }
}