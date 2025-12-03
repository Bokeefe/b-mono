import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api.service';
import MobileButton from '../../components/MobileButton/MobileButton';
import fireplaceGif from '../../assets/fireplace.webp';
import './SloMo.scss';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string;
}

// LocalStorage keys
const STORAGE_KEYS = {
  VOLUME: 'slomo_volume',
  SPEED: 'slomo_speed',
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
  // Volume is always 1.0 (full volume) - no user control needed
  const volume = 1.0;
  const [playbackSpeed, setPlaybackSpeed] = useState(() => loadFromStorage(STORAGE_KEYS.SPEED, 0.8));
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Audio refs - use HTML5 audio for all platforms
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null); // Preload next track for seamless transitions
  const [soundLoaded, setSoundLoaded] = useState(false);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const currentTrack = tracks[currentTrackIndex];

  // Handle page visibility changes to keep audio playing in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        // Page became hidden - remember if we were playing
        wasPlayingBeforeHiddenRef.current = !audio.paused;
      } else {
        // Page became visible again - resume if we were playing
        if (wasPlayingBeforeHiddenRef.current && audio.paused) {
          audio.play().catch((error) => {
            console.warn('Could not resume playback:', error);
          });
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

  // Volume is fixed at 1.0, no persistence needed

  // Persist playback speed to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SPEED, playbackSpeed);
  }, [playbackSpeed]);

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
        // Don't auto-play - requires user interaction on mobile browsers
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setIsLoadingTracks(false);
      }
    };

    fetchTracks();
  }, [selectedGenre]);

  // Initialize audio when track changes - use HTML5 audio for all platforms
  useEffect(() => {
    if (tracks.length === 0 || !currentTrack) return;

    if (audioRef.current) {
      try {
        // Stop and clean up HTML5 audio completely
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current.load(); // Reset the audio element
      } catch (e) {
        // Ignore cleanup errors
      }
      audioRef.current = null;
    }

    // Use HTML5 audio for all platforms
    const audio = new Audio(currentTrack.src);
    audio.preload = 'auto';
    audio.volume = volume;
    audio.playbackRate = playbackSpeed;
    
    // Preload the next track for seamless transitions
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    const nextTrack = tracks[nextIndex];
    if (nextTrack && tracks.length > 1) {
      // Clean up previous preloaded track
      if (nextAudioRef.current) {
        try {
          nextAudioRef.current.pause();
          nextAudioRef.current.src = '';
          nextAudioRef.current = null;
        } catch (e) {
          // Ignore
        }
      }
      
      // Preload next track
      const nextAudio = new Audio(nextTrack.src);
      nextAudio.preload = 'auto';
      nextAudio.volume = volume;
      nextAudio.playbackRate = playbackSpeed;
      nextAudioRef.current = nextAudio;
    }
    
    audio.addEventListener('loadeddata', () => {
      setSoundLoaded(true);
      // Try to play if we should be playing
      // Use a small delay to ensure audio is fully ready
      if (isPlaying) {
        // Try multiple times with increasing delays to handle autoplay restrictions
        const tryPlay = (attempt: number = 0) => {
          const currentAudio = audioRef.current;
          if (currentAudio && currentAudio === audio) {
            // Check if we should still be playing (state might have changed)
            if (isPlaying) {
              currentAudio.play().then(() => {
                // Success - playback started
              }).catch(() => {
                if (attempt < 3) {
                  // Retry with increasing delay
                  setTimeout(() => tryPlay(attempt + 1), 100 * (attempt + 1));
                } else {
                  console.warn('Autoplay blocked after retries');
                  // Keep isPlaying true - user can manually play
                }
              });
            }
          }
        };
        
        // Start trying to play
        setTimeout(() => tryPlay(), 50);
      }
    });
    
    // Also try to play when canplay event fires (audio is ready to play)
    audio.addEventListener('canplay', () => {
      if (isPlaying && audio.paused) {
        // Audio is ready and we should be playing, but it's paused
        audio.play().catch(() => {
          // Autoplay might be blocked, but that's okay
          // The play/pause effect will handle it
        });
      }
    });

    // Handle track end - use preloaded next track for seamless transition
    const handleTrackEnd = () => {
      if (tracks.length === 0) return;
      
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      const nextTrack = tracks[nextIndex];
      if (!nextTrack) return;
      
      // Use preloaded audio if available, otherwise create new
      let nextAudio = nextAudioRef.current;
      
      if (!nextAudio || nextAudio.src !== nextTrack.src) {
        // Create new audio if preload didn't work
        nextAudio = new Audio(nextTrack.src);
        nextAudio.preload = 'auto';
        nextAudio.volume = volume;
        nextAudio.playbackRate = playbackSpeed;
      }
      
      // Update state
      setCurrentTrackIndex(nextIndex);
      setIsPlaying(true);
      
      // Set up event handlers for the next track
      const handleNextLoaded = () => {
        setSoundLoaded(true);
      };
      nextAudio.addEventListener('loadeddata', handleNextLoaded);
      
      // Handle next track ending
      const handleNextTrackEnd = () => {
        if (tracks.length > 0) {
          const nextNextIndex = (nextIndex + 1) % tracks.length;
          setCurrentTrackIndex(nextNextIndex);
          setIsPlaying(true);
        }
      };
      nextAudio.addEventListener('ended', handleNextTrackEnd);
      
      // Set up progress checking for next track
      const checkNextProgress = () => {
        if (nextAudio && nextAudio.duration && !isNaN(nextAudio.duration) && 
            nextAudio.currentTime >= nextAudio.duration - 0.1) {
          handleNextTrackEnd();
        }
      };
      nextAudio.addEventListener('timeupdate', checkNextProgress);
      
      // Replace current audio immediately
      const oldAudio = audioRef.current;
      audioRef.current = nextAudio;
      nextAudioRef.current = null; // Clear preload ref
      setSoundLoaded(nextAudio.readyState >= 2); // Set loaded if already ready
      
      // Clean up old audio
      if (oldAudio && oldAudio !== nextAudio) {
        try {
          oldAudio.pause();
          oldAudio.currentTime = 0;
          oldAudio.src = '';
          oldAudio.load();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // Try to start playing immediately - this is critical for background playback
      // The preloaded track should be ready, so we can start immediately
      const tryStartNext = () => {
        if (nextAudio && nextAudio.readyState >= 2) {
          // Audio is ready - try to play
          nextAudio.play().then(() => {
            // Success! Track is playing
          }).catch(() => {
            // Autoplay blocked - try again when canplay fires
            const tryAgain = () => {
              if (nextAudio && nextAudio.paused && isPlaying) {
                nextAudio.play().catch(() => {
                  // Still blocked - play/pause effect will handle it
                });
              }
            };
            nextAudio.addEventListener('canplay', tryAgain, { once: true });
          });
        } else {
          // Wait for audio to be ready
          nextAudio.addEventListener('canplaythrough', () => {
            if (nextAudio && isPlaying && nextAudio.paused) {
              nextAudio.play().catch(() => {
                // Autoplay blocked
              });
            }
          }, { once: true });
        }
      };
      
      // Start immediately if ready, otherwise wait
      if (nextAudio.readyState >= 2) {
        tryStartNext();
      } else {
        nextAudio.addEventListener('canplaythrough', tryStartNext, { once: true });
      }
      
      // Preload the track after next for continuous playback
      const nextNextIndex = (nextIndex + 1) % tracks.length;
      const nextNextTrack = tracks[nextNextIndex];
      if (nextNextTrack && tracks.length > 1) {
        const nextNextAudio = new Audio(nextNextTrack.src);
        nextNextAudio.preload = 'auto';
        nextNextAudio.volume = volume;
        nextNextAudio.playbackRate = playbackSpeed;
        nextAudioRef.current = nextNextAudio;
      }
    };

    audio.addEventListener('ended', handleTrackEnd);
    
    // Fallback: Check progress periodically, especially when page is hidden
    // This ensures track advances even when screen is inactive
    const checkProgress = () => {
      if (audio && audio.duration && !isNaN(audio.duration) && 
          audio.currentTime >= audio.duration - 0.1) {
        // Track has finished (within 0.1 seconds of end)
        handleTrackEnd();
      }
    };
    
    // Check progress on timeupdate for immediate response
    // This works even when page is hidden
    audio.addEventListener('timeupdate', checkProgress);
    
    // Also set up a periodic check as a fallback (every 1 second)
    // This is especially important when page is hidden
    const progressCheckInterval = setInterval(() => {
      const currentAudio = audioRef.current;
      if (currentAudio && currentAudio === audio) {
        checkProgress();
      }
    }, 1000);

    audioRef.current = audio;
    setSoundLoaded(false);
    
    return () => {
      if (audio) {
        try {
          // Clear interval
          clearInterval(progressCheckInterval);
          // Remove event listeners
          audio.removeEventListener('ended', handleTrackEnd);
          audio.removeEventListener('timeupdate', checkProgress);
          // Clean up audio
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          audio.load();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [currentTrackIndex, tracks, playbackSpeed, isPlaying]);

  // Update playback speed - apply immediately when changed
  useEffect(() => {
    if (!soundLoaded) return;

    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, soundLoaded]);

  // Handle play/pause
  useEffect(() => {
    if (tracks.length === 0 || !soundLoaded) return;

    const audio = audioRef.current;
    if (!audio || !soundLoaded) return; // Wait for audio to be loaded

    try {
      if (isPlaying) {
        // Try to play - use a small delay to ensure audio is ready
        // Also retry if first attempt fails (common when screen is inactive)
        const tryPlay = (attempt: number = 0) => {
          const currentAudio = audioRef.current;
          if (currentAudio && currentAudio === audio) {
            // Check current playing state
            if (isPlaying && currentAudio.paused) {
              currentAudio.play().then(() => {
                // Success - playback started
              }).catch(() => {
                if (attempt < 2) {
                  // Retry with increasing delay
                  setTimeout(() => tryPlay(attempt + 1), 200 * (attempt + 1));
                } else {
                  console.warn('Playback blocked after retries');
                  // Keep isPlaying true - user can manually play
                }
              });
            }
          }
        };
        
        setTimeout(() => tryPlay(), 50);
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      // Don't automatically set isPlaying to false - let user control it
    }
  }, [isPlaying, tracks.length, soundLoaded]);


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
    // Stop current audio immediately before changing tracks
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    // Stop current audio immediately before changing tracks
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  // Volume control removed - always at 1.0

  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    
    // Update immediately for better UX
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = newSpeed;
    }
  };


  const selectTrack = (index: number) => {
    // Stop current audio immediately before changing tracks
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
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
    <div className={`slomo-container ${selectedGenre === 'xmas' ? 'xmas-playlist' : ''}`}>
      {selectedGenre === 'xmas' && (
        <div className="fireplace-background" style={{ backgroundImage: `url(${fireplaceGif})` }}></div>
      )}

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
