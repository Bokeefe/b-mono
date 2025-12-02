import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api.service';
import MobileButton from '../../components/MobileButton/MobileButton';
import './SloMo.scss';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
}

const SloMo: React.FC = () => {
  // Genre selection state
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  // Player state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.8);
  const [reverb, setReverb] = useState(0.5);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setIsLoadingGenres(true);
        const genreList = await apiService.getSlomoGenres();
        setGenres(genreList);
      } catch (error) {
        console.error('Failed to load genres:', error);
      } finally {
        setIsLoadingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  // Fetch tracks when genre is selected
  useEffect(() => {
    if (!selectedGenre) return;

    const fetchTracks = async () => {
      try {
        setIsLoadingTracks(true);
        const trackPaths = await apiService.getSlomoTracks(selectedGenre);
        
        // Shuffle tracks randomly
        const shuffled = [...trackPaths].sort(() => Math.random() - 0.5);
        
        // Extract artist from folder structure
        // Expected structure: genres/xmas/ArtistName/... or genres/xmas/ArtistName/Album/...
        // Backend returns relative paths from genre folder, so first part is artist
        const extractArtist = (path: string): string => {
          const parts = path.split('/').filter(p => p.trim() !== '');
          
          // First folder in path should be artist name
          if (parts.length > 0 && parts[0]) {
            let artist = parts[0];
            // Clean up common patterns but keep the artist name intact
            artist = artist.replace(/\[.*?\]/g, ''); // Remove brackets
            artist = artist.replace(/\(.*?\)/g, ''); // Remove parentheses (like year)
            artist = artist.replace(/\s+/g, ' ').trim(); // Clean up whitespace
            
            // Only use if it looks like an artist name (not too long, not just numbers)
            if (artist && artist.length < 100 && !/^\d+$/.test(artist)) {
              return artist;
            }
          }
          
          // Fallback to genre name if no artist found
          return selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1);
        };
        
        // Convert track paths to Track objects
        const trackObjects: Track[] = shuffled.map((path, index) => {
          // Extract title from filename
          // Remove directory path and .mp3 extension
          const filename = path.split('/').pop() || path;
          let title = filename.replace(/\.mp3$/i, '');
          
          // Clean up common patterns from filenames
          title = title.replace(/^(\d+)\s*-\s*/, ''); // Remove leading track numbers
          title = title.replace(/\[.*?\]/g, ''); // Remove brackets and content
          title = title.replace(/\s+/g, ' ').trim(); // Clean up whitespace
          
          return {
            id: `track-${index}`,
            title: title || `Track ${index + 1}`,
            artist: extractArtist(path),
            src: `/audio/slomo/genres/${selectedGenre}/${path}`,
          };
        });

        setTracks(trackObjects);
        setCurrentTrackIndex(0);
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchTracks();
  }, [selectedGenre]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (tracks.length > 0) {
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
        setIsPlaying(true);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && tracks.length > 0) {
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrackIndex, tracks]);

  // Apply playback speed to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Generate impulse response for reverb
  const createReverbImpulse = (audioContext: AudioContext, duration: number, decay: number): AudioBuffer => {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
      rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    }

    return impulse;
  };

  // Set up Web Audio API for reverb
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    // Initialize AudioContext
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        return;
      }
    }

    const audioContext = audioContextRef.current;

    // Create audio graph if not exists
    if (!sourceNodeRef.current) {
      // Set audio element volume to 1 since we control volume via Web Audio API
      audio.volume = 1;
      
      sourceNodeRef.current = audioContext.createMediaElementSource(audio);
      
      // Create nodes
      dryGainRef.current = audioContext.createGain();
      wetGainRef.current = audioContext.createGain();
      masterGainRef.current = audioContext.createGain();
      convolverRef.current = audioContext.createConvolver();

      // Create impulse response
      const impulse = createReverbImpulse(audioContext, 2, 2);
      convolverRef.current.buffer = impulse;

      // Connect: source -> dry gain -> master
      //          source -> convolver -> wet gain -> master
      sourceNodeRef.current.connect(dryGainRef.current);
      sourceNodeRef.current.connect(convolverRef.current);
      convolverRef.current.connect(wetGainRef.current);
      dryGainRef.current.connect(masterGainRef.current);
      wetGainRef.current.connect(masterGainRef.current);
      masterGainRef.current.connect(audioContext.destination);

      // Set initial values
      masterGainRef.current.gain.value = volume;
      dryGainRef.current.gain.value = 1 - reverb;
      wetGainRef.current.gain.value = reverb;
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect here as we want to keep the graph for the next track
    };
  }, [tracks, currentTrackIndex]);

  // Apply reverb amount
  useEffect(() => {
    const dryGain = dryGainRef.current;
    const wetGain = wetGainRef.current;

    if (!dryGain || !wetGain) return;

    // Dry signal: 1 - reverb (more reverb = less dry)
    // Wet signal: reverb (more reverb = more wet)
    dryGain.gain.value = 1 - reverb;
    wetGain.gain.value = reverb;
  }, [reverb]);

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
  };

  const handleBackToGenres = () => {
    setSelectedGenre(null);
    setTracks([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);
    setShowPlaylist(false);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    // Use Web Audio API gain if available, otherwise fall back to audio element
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = newVolume;
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.volume = newVolume;
      }
    }
  };

  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newSpeed = parseFloat(e.target.value);
    audio.playbackRate = newSpeed;
    setPlaybackSpeed(newSpeed);
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReverb = parseFloat(e.target.value);
    setReverb(newReverb);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setShowPlaylist(false);
  };

  // Show genre selection screen
  if (!selectedGenre) {
    return (
      <div className="slomo-container genre-selection">
        <div className="genre-selection-content">
          <h1>Playlists</h1>
          {isLoadingGenres ? (
            <p>Loading genres...</p>
          ) : genres.length === 0 ? (
            <p>No genres available</p>
          ) : (
            <div className="genre-buttons">
              {genres.map((genre) => (
                <MobileButton
                  key={genre}
                  onClick={() => handleGenreSelect(genre)}
                >
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </MobileButton>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show loading state while tracks are being fetched
  if (isLoadingTracks || tracks.length === 0) {
    return (
      <div className="slomo-container">
        <div className="loading-state">
          <h2>Loading {selectedGenre} tracks...</h2>
          <p>Creating your random playlist...</p>
        </div>
      </div>
    );
  }

  // Show player
  return (
    <div className="slomo-container">
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        preload="metadata"
      />

      {/* Back button */}
      <button className="back-button" onClick={handleBackToGenres}>
        ← playlists
      </button>

      {/* Main Player View */}
      <div className="player-main">
        {/* Track Info */}
        <div className="track-info">
          <h2 className="track-title">{currentTrack?.title || 'No track'}</h2>
          <p className="track-artist">{currentTrack?.artist || 'Unknown artist'}</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="progress-bar"
          />
        </div>

        {/* Controls */}
        <div className="player-controls">
          <button
            className="control-btn"
            onClick={handlePrevious}
            aria-label="Previous track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            className="control-btn play-pause"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            className="control-btn"
            onClick={handleNext}
            aria-label="Next track"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume Control */}
        <div className="volume-section">
          <svg viewBox="0 0 24 24" fill="currentColor" className="volume-icon">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-bar"
          />
        </div>

        {/* Playback Speed Control */}
        <div className="speed-section">
          <svg viewBox="0 0 24 24" fill="currentColor" className="speed-icon">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
          <input
            type="range"
            min="0.25"
            max="1"
            step="0.05"
            value={playbackSpeed}
            onChange={handlePlaybackSpeedChange}
            className="speed-bar"
          />
          <span className="speed-value">{playbackSpeed.toFixed(2)}x</span>
        </div>

        {/* Reverb Control */}
        <div className="reverb-section">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="reverb-icon">
            {/* Spring/Coil icon - helical spring */}
            <path d="M12 2 Q8 3 8 6 Q8 9 12 10 Q16 9 16 6 Q16 3 12 2" />
            <path d="M12 10 Q8 11 8 14 Q8 17 12 18 Q16 17 16 14 Q16 11 12 10" />
            <path d="M12 18 Q8 19 8 22" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={reverb}
            onChange={handleReverbChange}
            className="reverb-bar"
          />
          <span className="reverb-value">{Math.round(reverb * 100)}%</span>
        </div>

        {/* Playlist Toggle */}
        <button
          className="playlist-toggle"
          onClick={() => setShowPlaylist(!showPlaylist)}
        >
          {showPlaylist ? 'Hide' : 'Show'} Playlist ({tracks.length} tracks)
        </button>
      </div>

      {/* Playlist */}
      {showPlaylist && (
        <div className="playlist">
          <h3>Playlist</h3>
          <ul className="track-list">
            {tracks.map((track, index) => (
              <li
                key={track.id}
                className={`track-item ${index === currentTrackIndex ? 'active' : ''}`}
                onClick={() => selectTrack(index)}
              >
                <div className="track-item-info">
                  <span className="track-item-title">{track.title}</span>
                  <span className="track-item-artist">{track.artist}</span>
                </div>
                {index === currentTrackIndex && isPlaying && (
                  <div className="playing-indicator">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SloMo;
