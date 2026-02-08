import { Injectable } from '@nestjs/common';
import { readdir, readdirSync, statSync, existsSync } from 'fs';
import { join, sep } from 'path';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);

@Injectable()
export class SlomoService {
  // In production, files are in dist folder (Vite copies public to dist)
  // In development, files are in public folder
  private readonly audioBasePath = (() => {
    const publicPath = join(
      process.cwd(),
      '..',
      'react-fe',
      'public',
      'audio',
      'slomo',
      'genres',
    );
    const distPath = join(
      process.cwd(),
      '..',
      'react-fe',
      'dist',
      'audio',
      'slomo',
      'genres',
    );
    
    // Check if dist path exists (production), otherwise use public (development)
    if (existsSync(distPath)) {
      return distPath;
    }
    
    return publicPath;
  })();

  async getGenres(): Promise<string[]> {
    try {
      console.log('Looking for genres at:', this.audioBasePath);
      const entries = await readdirAsync(this.audioBasePath, {
        withFileTypes: true,
      });
      const genres = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      console.log('Found genres:', genres);
      return genres;
    } catch (error) {
      console.error('Error reading genres from:', this.audioBasePath);
      console.error('Error details:', error);
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

