# Text Corpse Game - Functionality Summary

## Overview

A collaborative text-writing game where multiple users can contribute to shared "rooms" of text in real-time via WebSocket connections. Its patterened off of the idea of a exquisite corpse drawing game the dada artists used to play. Here it is text based. The ideas that the first person adds a sensor to that is limited by length ads to the group chat, and the next person can add to the text chain as well, but after a certain point, the text disappears from visibility so as more people contribute, they can't really see the full context they just need to add onto the last sense or two that they after a certain point in this case, when a password is given to unlock the corpse that the users decide to unlock it then all the users can see the full text created together. That's the basic concept.

## Current State

Working as intended (as of the latest fix).

- Shared rooms over WebSockets are stable. From the Lobby you can create a new
  corpse or join an existing one, and the public room list loads from the server.
- **Submitting text works.** Inside a room you type into the textarea and submit;
  the text is appended to the room's shared text and broadcast to everyone in the
  room in real time.
- **Corpses default to locked.** Entering any room hides the accumulated text
  (only a short, faded tail is visible). To reveal the full text, click
  **Unlock** and enter the password:
  - password-protected room -> must match the room password (or the master
    password `corpseunlock`);
  - room with no password -> any non-empty entry unlocks it.
- **You can always write while locked.** That is the point of the game: you add
  blind, then unlock together to read the finished corpse. Locking controls
  *visibility* of the text only; it does not block submissions.
- The creator, who sets the password at creation time, opens the room already
  unlocked. Everyone else enters locked.

### A note on the lock

The lock is presentational: locked clients still receive the room text over the
socket, but the UI renders only the last/faded portion. It hides text from casual
eyes, it is not a security boundary.

### Fix history (what changed)

An earlier version had the locking logic effectively reversed, which made
submitting impossible:

1. The client blocked `handleSubmit` whenever `isLocked` was true.
2. The 1s fallback `getRoomData` fetch omitted `isLocked`, and the client
   defaulted that to `true`, so even open rooms flipped to locked.
3. `joinRoom` always reported `isLocked: true` for password rooms, and after
   unlocking the client re-joined *without* the password, so the unlock never
   stuck.

Fixed by tracking per-client unlock state on the gateway (`unlockedRooms`) and
deriving `isLocked` from it, and by no longer gating submission on the lock in
the React component.

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

- `joinRoom` - Join a room `{roomId, password?}`; server replies with `roomData`
  (and `joinRoomError` if a supplied password is rejected)
- `createRoom` - Create a room `{roomId, password, isPublic}`
- `getRooms` - Request the list of public rooms
- `getRoomData` - Request current text for a room `{roomId}`
- `appendText` - Append text to a room `{roomId, text}` (auto-spaces between words)
- `updateText` - Replace entire room text `{roomId, text}`
- `unlockRoom` - Reveal the full text for this client `{roomId, password}`

### Server → Client

- `activeRooms` - Array of `{id: string}` public room objects
- `roomData` - `{roomId, text, isLocked}` - `isLocked` is per-client: `true` until
  this client unlocks the room
- `textUpdated` - Broadcast when room text changes `{roomId, text}`
- `createRoomSuccess` - `{roomId}` / `createRoomError` - `{error}`
- `joinRoomError` - `{error}` (e.g. `"Invalid password"`)
- `unlockRoomSuccess` - `{roomId}` / `unlockRoomError` - `{error}`

## HTTP Endpoints

- `GET /backup` - Download JSON backup file with date-stamped filename

## Key Features

1. **Real-time Collaboration**: Multiple users can write to the same room simultaneously
2. **Auto-spacing**: Intelligently adds spaces between words when appending text
3. **Character Limit**: 170 characters per submission
4. **Room Persistence**: Rooms persist across server restarts via JSON file
5. **Production Ready**: Uses persistent volume mount for data in production
6. **Locked by Default**: The accumulated text is hidden until the room password
   is entered (see Current State); writing is always allowed

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
