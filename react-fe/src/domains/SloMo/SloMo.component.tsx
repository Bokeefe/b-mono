import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api.service';
import MobileButton from '../../components/MobileButton/MobileButton';
import Pizzicato from 'pizzicato';
import './SloMo.scss';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
}

// Detect mobile devices
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// LocalStorage keys
const STORAGE_KEYS = {
  VOLUME: 'slomo_volume',
  SPEED: 'slomo_speed',
  REVERB: 'slomo_reverb',
};

// Load value from localStorage with fallback
const loadFromStorage = (key: string, defaultValue: number): number => {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

// Save value to localStorage
const saveToStorage = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, value.toString());
  } catch (error) {
    console.warn(`Error saving ${key} to localStorage:`, error);
  }
};

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
  const [volume, setVolume] = useState(() => loadFromStorage(STORAGE_KEYS.VOLUME, 1));
  const [playbackSpeed, setPlaybackSpeed] = useState(() => loadFromStorage(STORAGE_KEYS.SPEED, 0.8));
  const [reverb, setReverb] = useState(() => loadFromStorage(STORAGE_KEYS.REVERB, 0.5));
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Detect if we're on mobile
  const isMobile = useRef(isMobileDevice());

  // Pizzicato sound and effects
  const soundRef = useRef<Pizzicato.Sound | null>(null);
  const reverbEffectRef = useRef<Pizzicato.Effects.Reverb | null>(null);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Handle page visibility changes to keep audio playing in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      const sound = soundRef.current;
      if (!sound) return;

      if (document.hidden) {
        // Page became hidden - remember if we were playing
        wasPlayingBeforeHiddenRef.current = sound.playing;
        // Try to keep playing (iOS may still pause, but we try)
      } else {
        // Page became visible again - resume if we were playing
        if (wasPlayingBeforeHiddenRef.current && !sound.playing) {
          try {
            sound.play();
          } catch (error) {
            console.warn('Could not resume playback:', error);
          }
        }
      }
    };

    // Request wake lock to keep screen/CPU active (if supported)
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
          wakeLock.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        } catch (error) {
          // Wake lock not supported or denied
          console.warn('Wake lock not available:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      const wakeLock = wakeLockRef.current;
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Set up Media Session API for better background playback support
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const mediaSession = (navigator as any).mediaSession;
    
    // Set metadata
    mediaSession.metadata = new (window as any).MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
    });

    // Handle media session actions
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handlePrevious = () => {
      setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
      setIsPlaying(true);
    };
    const handleNext = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
      setIsPlaying(true);
    };

    mediaSession.setActionHandler('play', handlePlay);
    mediaSession.setActionHandler('pause', handlePause);
    mediaSession.setActionHandler('previoustrack', handlePrevious);
    mediaSession.setActionHandler('nexttrack', handleNext);

    return () => {
      // Clean up media session
      if (mediaSession) {
        mediaSession.metadata = null;
        mediaSession.setActionHandler('play', null);
        mediaSession.setActionHandler('pause', null);
        mediaSession.setActionHandler('previoustrack', null);
        mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack, tracks.length]);

  // Persist volume to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VOLUME, volume);
  }, [volume]);

  // Persist playback speed to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SPEED, playbackSpeed);
  }, [playbackSpeed]);

  // Persist reverb to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REVERB, reverb);
  }, [reverb]);

  // Set up Media Session API for better background playback support
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const mediaSession = (navigator as any).mediaSession;
    
    // Set metadata
    mediaSession.metadata = new (window as any).MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
    });

    // Handle media session actions
    mediaSession.setActionHandler('play', () => {
      setIsPlaying(true);
    });

    mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false);
    });

    mediaSession.setActionHandler('previoustrack', () => {
      handlePrevious();
    });

    mediaSession.setActionHandler('nexttrack', () => {
      handleNext();
    });

    return () => {
      // Clean up media session
      if (mediaSession) {
        mediaSession.metadata = null;
        mediaSession.setActionHandler('play', null);
        mediaSession.setActionHandler('pause', null);
        mediaSession.setActionHandler('previoustrack', null);
        mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack, isPlaying]);

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
        // Don't auto-play on mobile - requires user interaction
        // Desktop can auto-play
        if (!isMobile.current) {
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchTracks();
  }, [selectedGenre]);

  // Initialize Pizzicato sound when track changes
  useEffect(() => {
    if (tracks.length === 0 || !currentTrack) return;

    // Clean up previous sound
    if (soundRef.current) {
      try {
        const prevSound = soundRef.current;
        if (prevSound.playing) {
          prevSound.stop();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }

    let sound: Pizzicato.Sound | null = null;
    let reverbEffect: Pizzicato.Effects.Reverb | null = null;

    try {
      // Create new Pizzicato sound
      sound = new Pizzicato.Sound(
        {
          source: 'file',
          options: {
            path: currentTrack.src,
            loop: false,
          }
        },
        (error?: Error) => {
          // Sound loaded callback
          if (error) {
            console.error('Error loading sound:', error);
            setSoundLoaded(false);
            return;
          }

          if (sound) {
            // Set volume (this should be safe)
            sound.volume = volume;
            
            // Set playback rate on the source node if available
            const soundAny = sound as any;
            if (soundAny.sourceNode && soundAny.sourceNode.playbackRate !== undefined) {
              soundAny.sourceNode.playbackRate.value = playbackSpeed;
            }
            
            // Mark sound as loaded
            setSoundLoaded(true);
            
            // If we should be playing, start playback now that it's loaded
            // Use a small delay to ensure everything is ready, especially on mobile
            if (isPlaying && sound) {
              setTimeout(() => {
                if (!sound) return;
                try {
                  sound.play();
                } catch (e) {
                  // Autoplay might be blocked - this is expected on mobile
                  // User will need to manually press play
                  console.warn('Autoplay blocked, user interaction required:', e);
                  setIsPlaying(false);
                }
              }, 100);
            }
          }
        }
      );

      // Create reverb effect with mobile-optimized settings
      reverbEffect = new Pizzicato.Effects.Reverb({
        time: isMobile.current ? 0.5 : 1.5, // Shorter reverb time on mobile
        decay: isMobile.current ? 0.3 : 0.8, // Lower decay on mobile
        reverse: false,
        mix: reverb, // Use current reverb state value
      });

      sound.addEffect(reverbEffect);
      reverbEffectRef.current = reverbEffect;
      soundRef.current = sound;
      
      // Reset loaded state while new sound is loading
      setSoundLoaded(false);
    } catch (error) {
      console.error('Error creating Pizzicato sound:', error);
      setSoundLoaded(false);
      return;
    }

    // No time tracking needed - just showing playing indicator

    // Handle track end - use Pizzicato's 'end' event
    const handleEnded = () => {
      if (tracks.length > 0) {
        setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
        setIsPlaying(true);
      }
    };

    if (sound) {
      sound.on('end', handleEnded);
    }

    return () => {
      if (sound) {
        try {
          sound.off('end', handleEnded);
        } catch (e) {
          // Ignore errors when removing listeners
        }
        try {
          if (sound.playing) {
            sound.stop();
          }
        } catch (e) {
          // Ignore errors when stopping - sound might already be cleaned up
        }
      }
    };
  }, [currentTrackIndex, tracks, playbackSpeed, volume]);

  // Update playback speed - only when sound is playing
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !soundLoaded || !isPlaying) return;

    try {
      // Pizzicato doesn't have a direct playbackRate property
      // We need to access the source node and set playbackRate on it
      const soundAny = sound as any;
      
      // Only try to set playbackRate if the sound is currently playing
      // and has a source node
      if (sound.playing && soundAny.sourceNode) {
        // Check if it's an AudioBufferSourceNode (which has playbackRate)
        if (soundAny.sourceNode.playbackRate !== undefined) {
          soundAny.sourceNode.playbackRate.value = playbackSpeed;
        }
      }
    } catch (error) {
      // Silently fail - playback rate might not be settable at this moment
      console.warn('Could not set playback speed:', error);
    }
  }, [playbackSpeed, soundLoaded, isPlaying]);

  // Handle play/pause - only after sound is loaded
  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || tracks.length === 0 || !soundLoaded) return;

    try {
      if (isPlaying && !sound.playing) {
        // Only play if not already playing
        try {
          sound.play();
        } catch (error) {
          // Playback might be blocked - reset playing state
          console.warn('Playback blocked:', error);
          setIsPlaying(false);
        }
        // Set playback rate after a short delay to ensure source node is created
        setTimeout(() => {
          const soundAny = sound as any;
          if (soundAny.sourceNode && soundAny.sourceNode.playbackRate !== undefined) {
            soundAny.sourceNode.playbackRate.value = playbackSpeed;
          }
        }, 10);
      } else if (!isPlaying && sound.playing) {
        // Only pause if currently playing
        sound.pause();
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      setIsPlaying(false);
    }
  }, [isPlaying, tracks.length, soundLoaded, playbackSpeed]);

  // Apply reverb amount using Pizzicato
  useEffect(() => {
    const reverbEffect = reverbEffectRef.current;
    if (!reverbEffect) return;

    // Update reverb mix (0 = dry, 1 = fully wet)
    reverbEffect.mix = reverb;
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    const sound = soundRef.current;
    if (sound) {
      sound.volume = newVolume;
    }
  };

  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sound = soundRef.current;
    if (!sound || !soundLoaded) return;

    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    
    // Try to set playback speed immediately if sound is playing
    // The useEffect will also handle this, but this gives immediate feedback
    if (sound.playing) {
      try {
        const soundAny = sound as any;
        if (soundAny.sourceNode && soundAny.sourceNode.playbackRate !== undefined) {
          soundAny.sourceNode.playbackRate.value = newSpeed;
        }
      } catch (error) {
        // Silently fail - the useEffect will handle it
      }
    }
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReverb = parseFloat(e.target.value);
    setReverb(newReverb);
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
          <h1>playlists</h1>
          <p>randomized slo mo playlists insired by the likes of DJ screw and the 🐐'ed <a href="https://youtu.be/adaTEdqR4xI?si=kLuG-OzSM3qHGGvN" target="_blank">Caretaker</a></p>   
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

        {/* Playing Indicator */}
        {/* {isPlaying && (
          <div className="playing-indicator-section">
            <svg viewBox="0 0 24 24" fill="currentColor" className="playing-icon">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="playing-text">Playing</span>
          </div>
        )} */}

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
            min="0.5"
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
