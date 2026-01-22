import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RoomData {
  text: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TextCorpseData {
  [roomId: string]: RoomData;
}

@Injectable()
export class TextCorpseService {
  // Persistent data directory - outside git-tracked files for production
  // Can be overridden with TEXT_CORPSE_DATA_DIR environment variable
  private readonly dataDir = process.env.TEXT_CORPSE_DATA_DIR || '/usr/src/app/data';
  private readonly dataFileName = 'text-corpse.data.json';

  // Public method to get the data file path (for backup controller)
  getDataFilePath(): string {
    return this.dataFilePath;
  }

  // Path that works in both dev (ts-node) and production
  // In production, uses persistent directory outside git-tracked files
  private readonly dataFilePath = (() => {
    // Check if we're in production (NODE_ENV=production or running from dist/)
    const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('dist');
    
    if (isProduction) {
      // Production: Use persistent data directory
      const persistentPath = path.join(this.dataDir, this.dataFileName);
      
      // Ensure the directory exists
      if (!fs.existsSync(this.dataDir)) {
        try {
          fs.mkdirSync(this.dataDir, { recursive: true });
          console.log(`[TextCorpseService] Created persistent data directory: ${this.dataDir}`);
        } catch (error) {
          console.error(`[TextCorpseService] Failed to create data directory ${this.dataDir}:`, error);
        }
      }
      
      console.log(`[TextCorpseService] Using persistent data path: ${persistentPath}`);
      return persistentPath;
    } else {
      // Development: Use source directory (git-tracked for dev convenience)
      const devPath = path.join(__dirname, this.dataFileName);
      console.log(`[TextCorpseService] Using dev path: ${devPath}`);
      return devPath;
    }
  })();

  async getData(): Promise<TextCorpseData> {
    try {
      // Ensure directory exists
      const dataDir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`[TextCorpseService] Created data directory: ${dataDir}`);
      }

      // Initialize file if it doesn't exist
      if (!fs.existsSync(this.dataFilePath)) {
        console.log(`[TextCorpseService] Data file does not exist, creating empty file at: ${this.dataFilePath}`);
        const emptyData: TextCorpseData = {};
        fs.writeFileSync(this.dataFilePath, JSON.stringify(emptyData, null, 2), 'utf-8');
        return emptyData;
      }
      
      const fileContent = fs.readFileSync(this.dataFilePath, 'utf-8');
      const raw = JSON.parse(fileContent || '{}');
      
      // Migrate old format (string values) to new format (object values)
      const migrated: TextCorpseData = {};
      let needsMigration = false;
      
      for (const [roomId, value] of Object.entries(raw)) {
        if (typeof value === 'string') {
          // Old format: migrate to new format
          migrated[roomId] = {
            text: value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          needsMigration = true;
        } else if (value && typeof value === 'object' && 'text' in value) {
          // New format: use as is
          migrated[roomId] = value as RoomData;
        }
      }
      
      // If migration happened, save the migrated data
      if (needsMigration) {
        await this.saveData(migrated);
        console.log(`[TextCorpseService] Migrated data format and saved`);
      }
      
      console.log(`[TextCorpseService] Successfully loaded data file from: ${this.dataFilePath}`);
      console.log(`[TextCorpseService] Found ${Object.keys(migrated).length} rooms: ${Object.keys(migrated).join(', ')}`);
      
      return migrated;
    } catch (error) {
      console.error(`[TextCorpseService] Error reading text-corpse data file:`, error instanceof Error ? error.message : error);
      console.error(`[TextCorpseService] File path attempted: ${this.dataFilePath}`);
      console.error(`[TextCorpseService] __dirname: ${__dirname}, cwd: ${process.cwd()}`);
      return {} as TextCorpseData;
    }
  }

  async getRoomData(roomId: string): Promise<string | null> {
    const data = await this.getData();
    const roomData = data[roomId];
    return roomData?.text || null;
  }

  async getRoomDataFull(roomId: string): Promise<RoomData | null> {
    const data = await this.getData();
    return data[roomId] || null;
  }

  async saveData(data: TextCorpseData): Promise<void> {
    fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async saveRoomData(roomId: string, text: string): Promise<void> {
    const data = await this.getData();
    const now = new Date().toISOString();
    const existingRoom = data[roomId];
    
    data[roomId] = {
      text,
      createdAt: existingRoom?.createdAt || now,
      updatedAt: now,
    };
    await this.saveData(data);
  }

  async appendRoomText(roomId: string, newText: string): Promise<string> {
    const data = await this.getData();
    const existingRoom = data[roomId];
    const existingText = existingRoom?.text || '';
    
    // Trim the new text
    const trimmedNewText = newText.trim();
    
    if (!trimmedNewText) {
      return existingText;
    }
    
    // Determine if we need to add a space
    let finalText: string;
    const trimmedExisting = existingText.trim();
    
    if (!trimmedExisting) {
      // No existing text, just use the new text
      finalText = trimmedNewText;
    } else {
      // Check if existing text ends with a character (non-whitespace) and new text starts with a character (non-whitespace)
      const lastChar = trimmedExisting.slice(-1);
      const firstChar = trimmedNewText.charAt(0);
      const isLastCharNonWhitespace = lastChar && !/\s/.test(lastChar);
      const isFirstCharNonWhitespace = firstChar && !/\s/.test(firstChar);
      
      if (isLastCharNonWhitespace && isFirstCharNonWhitespace) {
        finalText = trimmedExisting + ' ' + trimmedNewText;
      } else {
        finalText = trimmedExisting + trimmedNewText;
      }
    }
    
    // Save the updated text
    const now = new Date().toISOString();
    data[roomId] = {
      text: finalText,
      createdAt: existingRoom?.createdAt || now,
      updatedAt: now,
    };
    await this.saveData(data);
    
    return finalText;
  }
}
