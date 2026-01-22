# Text Corpse Game - Functionality Summary

## Overview
A collaborative text-writing game where multiple users can contribute to shared "rooms" of text in real-time via WebSocket connections.

## Architecture

### Backend (NestJS)
- **Service**: `TextCorpseService` - Manages room data persistence
- **Gateway**: `TextCorpseGateway` - Handles WebSocket connections on `/text-corpse` namespace
- **Controller**: `TextCorpseController` - Provides `/backup` endpoint for data downloads

### Frontend (React)
- **Lobby**: Room selection/creation interface
- **TextCorpse Component**: Main game interface for writing/reading text

## Data Storage

### Development
- File: `nest-server/src/text-corpse/text-corpse.data.json` (git-tracked)
- Format: JSON object with room IDs as keys, each containing `text`, `createdAt`, `updatedAt`

### Production
- File: `/usr/src/app/data/text-corpse.data.json` (persistent, outside container)
- Mounted via Docker volume: `/root/text-corpse-data:/usr/src/app/data`
- Automatically created if missing
- Not git-tracked (persists across deployments)

## WebSocket Events

### Client → Server
- `joinRoom` - Join a room and receive current text
- `getRooms` - Request list of all active rooms
- `getRoomData` - Request current text for a room
- `appendText` - Add new text to a room (auto-spaces between words)
- `updateText` - Replace entire room text

### Server → Client
- `activeRooms` - Array of `{id: string}` room objects
- `roomData` - Current text for a room `{roomId: string, text: string}`
- `textUpdated` - Broadcast when room text changes

## HTTP Endpoints

- `GET /backup` - Download JSON backup file with date-stamped filename

## Key Features

1. **Real-time Collaboration**: Multiple users can write to the same room simultaneously
2. **Auto-spacing**: Intelligently adds spaces between words when appending text
3. **Character Limit**: 170 characters per submission
4. **Room Persistence**: Rooms persist across server restarts via JSON file
5. **Production Ready**: Uses persistent volume mount for data in production

## Socket Configuration

- **Namespace**: `/text-corpse`
- **Path** (production): `/socket.io` (for nginx proxy)
- **Transport**: Polling only in production (Cloudflare compatibility)
- **CORS**: Enabled for all origins

## File Path Resolution

The service automatically detects environment:
- **Development**: Uses source directory (`src/text-corpse/`)
- **Production**: Uses persistent directory (`/usr/src/app/data/`)
- Can be overridden via `TEXT_CORPSE_DATA_DIR` environment variable

