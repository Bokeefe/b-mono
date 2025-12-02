# Lunch App Documentation

## Purpose
A real-time collaborative ranked choice voting app for groups to decide where to go for lunch. Users join rooms, propose restaurants, vote on suggestions, and after a 20-minute timer, the most popular choice is selected.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Socket.IO Client** for real-time communication (using polling transport)
- **SCSS** for styling

### Backend
- **NestJS** (Node.js framework)
- **Socket.IO** for WebSocket/polling server
- **Express** for HTTP server
- **TypeScript** throughout

### Infrastructure
- **Cloudflare** - CDN, SSL, and DDoS protection
- **nginx** - Reverse proxy and static file serving
- **Docker** - Containerization
- **DigitalOcean Droplet** - Hosting (Ubuntu 24.10)
- **Node.js 20** - Runtime

### Deployment Architecture
```
Client Browser
    ↓ (HTTPS)
Cloudflare (CDN/Proxy)
    ↓ (HTTPS)
nginx (Reverse Proxy)
    ↓ (HTTP)
NestJS Server (Port 4171)
    ↓
Socket.IO Gateway
```

## How It Works

### User Flow
1. User enters name (stored in localStorage)
2. User creates or joins a room by name
3. Room timer starts (20 minutes from first user or first suggestion)
4. Users can propose lunch places
5. Users vote on suggestions (can change votes)
6. After 20 minutes, room completes and winner is displayed
7. All users see the final decision

### Real-Time Features
- **Room State Sync**: All users see the same suggestions and votes in real-time
- **Active Rooms List**: Landing page shows all active rooms
- **Timer**: Countdown displayed to all users
- **Vote Changes**: Users can change votes until timeout

### Data Model
- **Room**: Contains users, suggestions, start time, and active status
- **Suggestion**: Contains place name, suggester, and votes array
- **Voting**: Each user can vote once, but can change their vote
- **Winner Selection**: Most votes wins (random tiebreaker if tied)

## Deployment Configuration

### Socket.IO Transport
**Current Setup**: Using polling transport only (not WebSocket)

**Why Polling?**
- Cloudflare uses HTTP/2 for client connections, which doesn't support WebSocket upgrades
- Polling transport works reliably through Cloudflare's proxy
- Functionality is identical - just uses HTTP long-polling instead of persistent WebSocket
- Slightly less efficient but much more reliable in this setup

**Configuration**:
- Frontend: `socket.service.ts` uses `transports: ['polling']` with `upgrade: false`
- Backend: `LunchGateway` supports both transports but client only uses polling
- No WebSocket upgrade attempts = no connection failures

### Key Deployment Files
- **Dockerfile**: Multi-stage build, includes nginx config with WebSocket proxy support
- **startup.sh**: Starts backend, waits for readiness, then starts nginx
- **nest-server/src/main.ts**: Express middleware excludes `/socket.io` and `/api` paths
- **nginx config**: Proxies `/socket.io` to backend with proper headers

## Key Implementation Details

### Backend (NestJS)
- **LunchGateway**: Handles all Socket.IO events
  - `joinRoom`: User joins a room, room created if doesn't exist
  - `addSuggestion`: Adds a lunch place suggestion
  - `vote`: User votes on a suggestion (can change vote)
  - `getRooms`: Returns list of active rooms
- **Room Management**: In-memory storage (Map-based, resets on server restart)
- **Timer Logic**: 20-minute countdown from room creation, checks every second
- **Winner Selection**: Most votes wins, random tiebreaker if tied

### Frontend (React)
- **Landing.tsx**: Room selection/creation page
- **Room.tsx**: Main voting interface with suggestions and timer
- **Socket Service**: Singleton service managing Socket.IO connection
- **State Management**: React hooks for room state, suggestions, votes

### Socket.IO Events
**Client → Server**:
- `joinRoom`: `{ roomId: string, userName: string }`
- `addSuggestion`: `{ roomId: string, suggestion: { id, place, suggestedBy } }`
- `vote`: `{ roomId: string, suggestionId: string, userName: string }`
- `getRooms`: Request active rooms list

**Server → Client**:
- `roomState`: Full room state (users, suggestions, votes)
- `activeRooms`: List of all active rooms
- `timeUpdate`: Remaining seconds in countdown
- `roomComplete`: Final winner when timer expires

## Deployment Notes

### Infrastructure Setup
- **Cloudflare**: SSL/TLS Full (Strict), WebSockets enabled, Page Rule for `/socket.io/*` (Cache: Bypass, Browser Integrity: Off)
- **nginx**: Reverse proxy with WebSocket support, serves static files, proxies `/api/` and `/socket.io` to NestJS
- **NestJS**: Runs on port 4171, serves static React app, handles API and Socket.IO

### Important Configuration Details
- **Express Middleware**: Excludes `/socket.io` and `/api` paths to let NestJS handle them
- **nginx map directive**: Conditionally sets Connection header for WebSocket upgrades (in `http` context)
- **Socket.IO path**: `/socket.io` (matches nginx proxy location)
- **Polling transport**: Used exclusively to avoid Cloudflare HTTP/2 WebSocket upgrade issues

### Development vs Production
- **Development**: Backend on `http://10.210.155.132:4171`, frontend on Vite dev server
- **Production**: Single Docker container with nginx + NestJS, served through Cloudflare
- **Environment detection**: Uses `import.meta.env.MODE` to determine production vs development

### Known Limitations
- **In-memory storage**: Rooms reset on server restart (no persistence)
- **No authentication**: Users identified by name only (stored in localStorage)
- **Polling overhead**: Slightly more HTTP requests than WebSocket, but functionally identical
