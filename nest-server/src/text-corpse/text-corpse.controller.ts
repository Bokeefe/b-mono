import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { TextCorpseService } from './text-corpse.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('backup')
export class TextCorpseController {
  constructor(private readonly textCorpseService: TextCorpseService) {}

  @Get()
  async downloadBackup(@Res() res: Response) {
    try {
      // Get the data file path from the service
      const filePath = this.textCorpseService.getDataFilePath();

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }

      // Set headers for file download
      const fileName = `text-corpse-backup-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Send the file
      return res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('[TextCorpseController] Error serving backup:', error);
      return res.status(500).json({ 
        error: 'Failed to generate backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

