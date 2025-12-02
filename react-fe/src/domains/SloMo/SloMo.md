# SloMo Music Player

## Overview
SloMo is a mobile-first music player application that allows users to select a genre and play a randomly shuffled playlist of MP3 files from that genre's directory.

## Architecture

### Backend (NestJS)
- **Module**: `nest-server/src/slomo/`
  - `slomo.module.ts`: NestJS module configuration
  - `slomo.controller.ts`: REST API endpoints
    - `GET /api/slomo/genres`: Returns list of available genre folders
    - `GET /api/slomo/genres/:genre/tracks`: Returns all MP3 file paths for a given genre
  - `slomo.service.ts`: File system operations
    - Recursively scans genre directories for MP3 files
    - Returns relative paths normalized for web use

### Frontend (React)
- **Component**: `react-fe/src/domains/SloMo/SloMo.component.tsx`
  - Genre selection screen: Displays buttons for each available genre
  - Music player: Full-featured player with playlist support
- **Styling**: `react-fe/src/domains/SloMo/SloMo.scss`
  - Mobile-first responsive design
  - Gradient background with glassmorphism effects
- **API Service**: `react-fe/src/services/api.service.ts`
  - `getSlomoGenres()`: Fetches available genres
  - `getSlomoTracks(genre)`: Fetches tracks for a specific genre

## File Structure
```
react-fe/public/audio/slomo/
  └── genres/
      └── {genre-name}/
          └── {nested folders and MP3 files}
```

MP3 files can be organized in any nested folder structure within each genre directory. The service recursively finds all `.mp3` files.

## User Flow
1. User navigates to `/slomo` route
2. Genre selection screen displays with buttons for each genre folder
3. User selects a genre (e.g., "xmas")
4. System fetches all MP3 files from that genre's directory
5. Tracks are randomly shuffled and converted to a playlist
6. Player automatically starts playing the first track
7. User can navigate back to genre selection via "Back to Genres" button

## Features
- **Genre Selection**: Dynamic genre buttons based on folders in `genres/` directory
- **Random Playlist**: Tracks are shuffled when a genre is selected
- **Track Title Extraction**: Automatically cleans filenames to extract readable track titles
  - Removes leading track numbers (e.g., "01 - ")
  - Removes bracket content (e.g., "[WwW.LoKoTorrents.CoM]")
  - Trims whitespace
- **Full Player Controls**:
  - Play/Pause
  - Next/Previous track
  - Progress bar with seek functionality
  - Volume control
  - Playlist view with track selection
- **Mobile-First Design**: Uses `MobileButton` component for genre selection, optimized for touch interfaces

## Technical Details

### Track Object Structure
```typescript
interface Track {
  id: string;
  title: string;      // Extracted from filename
  artist: string;      // Genre name (capitalized)
  src: string;         // Full path: /audio/slomo/genres/{genre}/{relativePath}
  cover?: string;      // Optional cover art
}
```

### Path Resolution
- Backend: Uses Node.js `fs` module to read filesystem
- Paths are normalized to use forward slashes for web compatibility
- Relative paths are preserved to maintain folder structure in URLs

### State Management
- Genre selection state
- Track list state (randomized)
- Player state (current track, playing status, time, volume)
- UI state (playlist visibility)

## Future Enhancement Ideas
- Add cover art support (images in genre folders)
- Add shuffle/repeat modes
- Add favorites/bookmarks
- Add search/filter within playlists
- Add metadata extraction from MP3 files (ID3 tags)
- Add playlist persistence (localStorage)
- Add genre-specific themes/colors
- Add playback speed control
- Add equalizer/audio effects

