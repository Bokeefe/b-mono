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
  // Path that works in both dev (ts-node) and production (compiled to dist)
  // Try multiple possible locations
  private readonly dataFilePath = (() => {
    // Option 1: In development with ts-node, __dirname is src/text-corpse
    const devPath = path.join(__dirname, 'text-corpse.data.json');
    
    // Option 2: In production, try going from dist/text-corpse up to src/text-corpse
    const prodPath = path.join(__dirname, '..', 'src', 'text-corpse', 'text-corpse.data.json');
    
    // Option 3: Use process.cwd() and find the correct path
    const cwd = process.cwd();
    // Try different possible locations from cwd
    const possiblePaths = [
      path.join(cwd, 'src', 'text-corpse', 'text-corpse.data.json'), // If cwd is nest-server
      path.join(cwd, 'nest-server', 'src', 'text-corpse', 'text-corpse.data.json'), // If cwd is workspace root
      path.join(cwd, '..', 'nest-server', 'src', 'text-corpse', 'text-corpse.data.json'), // If cwd is inside nest-server
    ];
    
    // Check which path exists (prioritize dev, then prod, then check all possible paths)
    let selectedPath: string | null = null;
    if (fs.existsSync(devPath)) {
      selectedPath = devPath;
    } else if (fs.existsSync(prodPath)) {
      selectedPath = prodPath;
    } else {
      // Try all possible paths from cwd
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          selectedPath = testPath;
          break;
        }
      }
      
      if (!selectedPath) {
        // Final fallback - use the first possible path even if it doesn't exist
        selectedPath = possiblePaths[0];
      }
    }
    
    return selectedPath!;
  })();

  async getData(): Promise<TextCorpseData> {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        console.error(`[TextCorpseService] File does not exist at: ${this.dataFilePath}`);
        return {} as TextCorpseData;
      }
      
      const fileContent = fs.readFileSync(this.dataFilePath, 'utf-8');
      const raw = JSON.parse(fileContent);
      
      // Migrate old format (string values) to new format (object values)
      const migrated: TextCorpseData = {};
      for (const [roomId, value] of Object.entries(raw)) {
        if (typeof value === 'string') {
          // Old format: migrate to new format
          migrated[roomId] = {
            text: value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else if (value && typeof value === 'object' && 'text' in value) {
          // New format: use as is
          migrated[roomId] = value as RoomData;
        }
      }
      
      return migrated;
    } catch (error) {
      console.error(`[TextCorpseService] Error reading text-corpse data file:`, error instanceof Error ? error.message : error);
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
