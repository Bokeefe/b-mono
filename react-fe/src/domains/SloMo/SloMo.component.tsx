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

  // Detect if we're on mobile
  const isMobile = useRef(isMobileDevice());

  // Pizzicato sound and effects
  const soundRef = useRef<Pizzicato.Sound | null>(null);
  const reverbEffectRef = useRef<Pizzicato.Effects.Reverb | null>(null);
  const timeUpdateThrottleRef = useRef<number | null>(null);
  const [soundLoaded, setSoundLoaded] = useState(false);

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
            
            // Try to get duration from the source node if available
            const soundAny = sound as any;
            if (soundAny.sourceNode && soundAny.sourceNode.buffer) {
              setDuration(soundAny.sourceNode.buffer.duration || 0);
              
              // Set playback rate on the source node if available
              if (soundAny.sourceNode.playbackRate !== undefined) {
                soundAny.sourceNode.playbackRate.value = playbackSpeed;
              }
            }
            
            // Mark sound as loaded
            setSoundLoaded(true);
            
            // If we should be playing, start playback now that it's loaded
            if (isPlaying) {
              try {
                sound.play();
              } catch (e) {
                console.error('Error playing sound after load:', e);
              }
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

    // Set up time tracking - Pizzicato doesn't expose currentTime directly
    // We'll track time manually using a timer
    let startTime = 0;
    let pausedTime = 0;
    let isPaused = false;

    const updateTime = () => {
      if (!sound || !sound.playing || isPaused) return;
      
      if (timeUpdateThrottleRef.current) {
        cancelAnimationFrame(timeUpdateThrottleRef.current);
      }
      timeUpdateThrottleRef.current = requestAnimationFrame(() => {
        if (sound && sound.playing && !isPaused) {
          const soundAny = sound as any;
          // Try to get current time from source node
          if (soundAny.sourceNode && soundAny.sourceNode.buffer) {
            const bufferDuration = soundAny.sourceNode.buffer.duration;
            if (bufferDuration) {
              // Approximate current time based on when playback started
              const elapsed = (Date.now() - startTime) / 1000;
              const current = (pausedTime + elapsed) % bufferDuration;
              setCurrentTime(current);
            }
          }
        }
      });
    };

    const timeInterval = setInterval(updateTime, 100); // Update every 100ms

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
      clearInterval(timeInterval);
      if (timeUpdateThrottleRef.current) {
        cancelAnimationFrame(timeUpdateThrottleRef.current);
      }
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
        sound.play();
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
    }
  }, [isPlaying, tracks.length, soundLoaded]);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sound = soundRef.current;
    if (!sound || !soundLoaded) return;

    const newTime = parseFloat(e.target.value);
    // Pizzicato doesn't support seeking directly, so we need to stop and restart
    // For now, just update the display time
    // Note: Full seeking would require stopping, setting offsetTime, and restarting
    setCurrentTime(newTime);
    
    // TODO: Implement proper seeking with Pizzicato if needed
    // This would require stopping the sound, setting offsetTime, and playing again
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
