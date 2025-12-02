import { Injectable } from '@nestjs/common';
import { readdir, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);

@Injectable()
export class SlomoService {
  private readonly audioBasePath = join(
    process.cwd(),
    '..',
    'react-fe',
    'public',
    'audio',
    'slomo',
    'genres',
  );

  async getGenres(): Promise<string[]> {
    try {
      const entries = await readdirAsync(this.audioBasePath, {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      console.error('Error reading genres:', error);
      return [];
    }
  }

  async getTracks(genre: string): Promise<string[]> {
    try {
      const genrePath = join(this.audioBasePath, genre);
      const tracks: string[] = [];

      // Recursively find all MP3 files
      const findMp3Files = (dir: string, basePath: string = genrePath): void => {
        const entries = readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            findMp3Files(fullPath, basePath);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp3')) {
            // Get relative path from genre directory, using path separator
            const relativePath = fullPath.replace(basePath + sep, '');
            // Normalize to forward slashes for web paths
            tracks.push(relativePath.split(sep).join('/'));
          }
        }
      };

      findMp3Files(genrePath);
      return tracks;
    } catch (error) {
      console.error(`Error reading tracks for genre ${genre}:`, error);
      return [];
    }
  }
}

