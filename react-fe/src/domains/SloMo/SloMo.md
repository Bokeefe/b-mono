# SloMo Music Player

## Overview
Mobile-first music player that plays randomly shuffled playlists from genre directories.

## Architecture
- **Backend**: `nest-server/src/slomo/` - Scans genre directories for MP3 files
- **Frontend**: `react-fe/src/domains/SloMo/` - React component with HTML5 audio + Web Audio API

## Features
- Genre selection with dynamic buttons
- Random shuffled playlists
- Play/Pause, Next/Previous, Seek, Speed control (0.5x-1.0x)
- Background playback (tracks advance when browser inactive)
- Reverb effect (delay-based, Web Audio API)

## Known Issues
1. **Mobile audio issues** - Howler.js attempt failed completely, reverted to HTML5 Audio
2. **Desktop audio not working** - Audio context becomes null after initialization (when Web Audio routing active)
3. **Reverb effect** - Implemented but may need tuning for audibility
4. **Invalid URI errors** - Some track paths may be malformed

## Technical Stack
- HTML5 Audio (persistent element for background playback)
- Web Audio API (MediaElementSourceNode for reverb routing)
- Platform detection (mobile vs desktop) for context handling

## Core Constraint: Reverb vs Mobile Playback

**The Fundamental Trade-off:**
- **Decent reverb requires Web Audio API** (delay nodes, impulse response, etc.)
- **Mobile background playback works best with pure HTML5 Audio** (persistent element, Media Session API)
- **Web Audio API has issues on mobile** when tab is inactive (context suspension, throttling)

**Previous Attempts:**

1. **Pizzicato.js:**
   - Preferred for reverb quality
   - Uses Web Audio API internally (creates its own AudioContext)
   - **Issues encountered:**
     - Background playback stopped when tab inactive
     - Track advancement didn't work reliably
     - Audio context suspension on mobile

2. **Howler.js:**
   - Attempted to use for better mobile support with reverb capability
   - **Failed completely on mobile:**
     - Did not work for mobile playback at all
     - Audio playback issues
     - Background playback problems
     - Complete failure - had to revert to HTML5 Audio

**Current Approach:**
- HTML5 Audio element (persistent, good for background playback)
- Always routes through Web Audio via `MediaElementSourceNode` (for reverb)
- **Problems:**
  - Desktop audio breaks (context becomes null)
  - Mobile background playback less reliable than pure HTML5 Audio
  - Reverb quality needs improvement

**Potential Solutions:**

1. **Lazy Web Audio Routing (Recommended)**
   - Start with pure HTML5 Audio (best mobile background playback)
   - Only create `MediaElementSourceNode` when reverb is enabled
   - Once created, it stays active (can't undo, but reverb requires it anyway)
   - **Benefit:** Reverb off = perfect mobile playback, Reverb on = reverb works

2. **Platform-Specific Routing**
   - Mobile: Pure HTML5 Audio (best background playback)
   - Desktop: HTML5 + Web Audio routing (better reverb support)
   - **Trade-off:** Reverb only works on desktop

3. **Fix Pizzicato Background Playback**
   - Use Pizzicato for reverb (better quality)
   - Keep HTML5 Audio for playback control
   - Bridge them together, handle context suspension better
   - **Challenge:** More complex, but might give best reverb

**Next Steps:**
- Decide which approach fits priorities
- If reverb quality is critical → Fix Pizzicato or improve current reverb
- If mobile playback reliability is critical → Lazy Web Audio routing
