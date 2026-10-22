import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ClaimjumpersService {
  // main.ts serves ./public as static assets, so the mp3s live here at runtime
  // (nest-server/public/audio/claimjumpers)
  private readonly audioDirectory = path.join(
    process.cwd(),
    'public',
    'audio',
    'claimjumpers',
  );

  // curl -X GET "http://localhost:4171/api/claimjumpers" -H "Accept: application/json"
  async getAudioFiles(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.audioDirectory);

      return files
        .filter((file) => path.extname(file).toLowerCase() === '.mp3')
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error(
        `Error reading audio files from: ${this.audioDirectory}`,
        error,
      );
      return [];
    }
  }

  // Resolves (and validates) an absolute path to a track so it can be streamed
  getAudioFilePath(filename: string): string {
    // basename() strips any path segments, preventing directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.audioDirectory, safeFilename);

    if (
      path.extname(safeFilename).toLowerCase() !== '.mp3' ||
      !fs.existsSync(filePath)
    ) {
      throw new NotFoundException(`File not found: ${filename}`);
    }

    return filePath;
  }

  async getAudioFile(filename: string): Promise<Buffer> {
    return fs.readFileSync(this.getAudioFilePath(filename));
  }
}
