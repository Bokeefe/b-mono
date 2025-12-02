# SloMo Audio Files

Place your MP3 files in this directory to use them in the SloMo music player.

## File Structure

```
public/audio/slomo/
  ├── track1.mp3
  ├── track2.mp3
  └── ...
```

## Usage

1. Add your MP3 files to this directory
2. Update the `defaultTracks` array in `SloMo.component.tsx` with your track information
3. Reference files using the path `/audio/slomo/your-file.mp3`

## Example Track Configuration

```typescript
{
  id: '1',
  title: 'Your Track Title',
  artist: 'Artist Name',
  src: '/audio/slomo/your-file.mp3',
  cover: '/images/cover.jpg' // optional
}
```

Files in the `public/` directory are served statically and can be referenced directly with paths starting with `/`.

