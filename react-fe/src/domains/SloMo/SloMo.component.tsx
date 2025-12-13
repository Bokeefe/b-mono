import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../../services/api.service';
import MobileButton from '../../components/MobileButton/MobileButton';
import fireplaceGif from '../../assets/fireplace.webp';
import bartenderImage from '../../assets/bartender.png';
import * as Pizzicato from 'pizzicato';
import { Sound, Effects } from 'pizzicato';
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

// Detect if we're on mobile
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
};

// Resume AudioContext for Pizzicato (required after user gesture)
const resumePizzicatoContext = (sound: Sound | null): Promise<void> => {
  return new Promise((resolve) => {
    try {
      // Access Pizzicato's AudioContext
      // Try multiple methods to find the context
      let context: AudioContext | undefined;
      
      // Method 1: Through the imported Pizzicato module
      if (Pizzicato && (Pizzicato as any).context) {
        context = (Pizzicato as any).context;
        console.log('Found Pizzicato.context from module, state:', context?.state);
      }
      // Method 2: Through window object (if Pizzicato exposes itself globally)
      else if ((window as any).Pizzicato?.context) {
        context = (window as any).Pizzicato.context;
        console.log('Found Pizzicato.context from window, state:', context?.state);
      }
      // Method 3: Through sound object's internal structure
      else if (sound) {
        const soundAny = sound as any;
        
        // Try various ways to access the context from the sound
        if (soundAny.masterGainNode?.context) {
          context = soundAny.masterGainNode.context;
          console.log('Found context through masterGainNode, state:', context?.state);
        } else if (soundAny.source?.context) {
          context = soundAny.source.context;
          console.log('Found context through source, state:', context?.state);
        } else if (soundAny._context) {
          context = soundAny._context;
          console.log('Found context through _context, state:', context?.state);
        } else if (soundAny.context) {
          context = soundAny.context;
          console.log('Found context directly on sound, state:', context?.state);
        }
      }
      
      if (!context) {
        console.warn('Could not find AudioContext. Trying to access through Sound object:', sound ? Object.keys(sound as any) : 'no sound');
        // Last resort: try to create a temporary sound to get the context
        try {
          const tempSound = new Sound({ source: 'wave', options: { frequency: 0 } }, () => {});
          const tempAny = tempSound as any;
          if (tempAny.masterGainNode?.context) {
            context = tempAny.masterGainNode.context;
            console.log('Found context through temporary sound, state:', context?.state);
            tempSound.stop();
          }
        } catch (e) {
          console.warn('Could not create temporary sound:', e);
        }
        
        if (!context) {
          console.warn('AudioContext is undefined - cannot resume');
          resolve();
          return;
        }
      }
      
      // Now we know context is defined
      // Firefox sometimes needs special handling
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      
      if (context.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        const resumePromise = context.resume();
        
        // Firefox sometimes needs a small delay
        if (isFirefox) {
          setTimeout(() => {
            resumePromise.then(() => {
              console.log('AudioContext resumed successfully (Firefox), new state:', context.state);
              resolve();
            }).catch((error) => {
              console.warn('Failed to resume AudioContext (Firefox):', error);
              // Try again after a short delay for Firefox
              setTimeout(() => {
                context.resume().then(() => {
                  console.log('AudioContext resumed on retry (Firefox)');
                  resolve();
                }).catch(() => resolve());
              }, 100);
            });
          }, 50);
        } else {
          resumePromise.then(() => {
            console.log('AudioContext resumed successfully, new state:', context.state);
            resolve();
          }).catch((error) => {
            console.warn('Failed to resume AudioContext:', error);
            resolve();
          });
        }
      } else if (context.state === 'running') {
        // Already running
        console.log('AudioContext already running');
        resolve();
      } else {
        // Unknown state, try to resume anyway
        console.log('AudioContext in unknown state:', context.state, ', attempting resume...');
        context.resume().then(() => {
          console.log('AudioContext resumed (unknown state), new state:', context.state);
          resolve();
        }).catch((error) => {
          console.warn('Failed to resume AudioContext (unknown state):', error);
          resolve();
        });
      }
    } catch (error) {
      console.warn('Error accessing AudioContext:', error);
      resolve();
    }
  });
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
  const [reverb, setReverb] = useState(() => loadFromStorage(STORAGE_KEYS.REVERB, .8 ));
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // HTML5 Audio refs - use persistent audio element for mobile background playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleTrackEndRef = useRef<(() => void) | null>(null);
  const checkProgressRef = useRef<(() => void) | null>(null);
  const progressCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Pizzicato.js refs for desktop
  const pizzicatoSoundRef = useRef<Sound | null>(null);
  const reverbEffectRef = useRef<Effects.Reverb | null>(null);
  
  // Detect platform on mount
  useEffect(() => {
    setIsDesktop(!isMobile());
  }, []);

  // Initialize persistent HTML5 audio element for mobile
  useEffect(() => {
    // Only initialize HTML5 Audio for mobile
    if (isMobile() && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = volume;
      audioRef.current = audio;
      
      // Set up persistent event handlers
      const handleEnded = () => {
        if (handleTrackEndRef.current) {
          handleTrackEndRef.current();
        }
      };
      
      const checkProgress = () => {
        if (checkProgressRef.current) {
          checkProgressRef.current();
        }
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('timeupdate', checkProgress);
      
      console.log('HTML5 Audio element initialized for mobile');
    }
    
    return () => {
      // Clean up on unmount
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = '';
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current);
      }
    };
  }, []);
  
  // Persist reverb to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REVERB, reverb);
    
    // Update reverb effect on desktop when reverb value changes
    // Update in place to avoid interrupting playback
    if (!isMobile() && pizzicatoSoundRef.current && soundLoaded) {
      const sound = pizzicatoSoundRef.current;
      
      if (reverb > 0) {
        // If effect exists, just update the mix value (no interruption)
        if (reverbEffectRef.current) {
          reverbEffectRef.current.mix = Math.min(reverb * 0.4, 0.4);
        } else {
          // Only create and add if it doesn't exist
          reverbEffectRef.current = new Effects.Reverb({
            time: 2.5,        // Longer reverb tail
            decay: 2.0,       // Longer decay
            reverse: false,
            mix: reverb, // Scale down mix (max 40% wet)
          });
          
          try {
            sound.addEffect(reverbEffectRef.current);
          } catch (e) {
            console.warn('Failed to add reverb effect:', e);
          }
        }
      } else {
        // Only remove if it exists and reverb is set to 0
        if (reverbEffectRef.current) {
          try {
            sound.removeEffect(reverbEffectRef.current);
          } catch (e) {
            // Ignore if not added
          }
          reverbEffectRef.current = null;
        }
      }
    }
  }, [reverb, soundLoaded]);

  const currentTrack = tracks[currentTrackIndex];

  // Helper function to find next track with different artist
  const findNextTrackWithDifferentArtist = (
    startIndex: number,
    currentArtist: string,
    direction: 'next' | 'prev' = 'next'
  ): number => {
    if (tracks.length === 0) return startIndex;
    
    let checked = 0;
    let index = startIndex;
    
    // Try to find a track with a different artist
    while (checked < tracks.length) {
      const track = tracks[index];
      if (track && track.artist !== currentArtist) {
        return index;
      }
      
      // Move to next/previous track
      if (direction === 'next') {
        index = (index + 1) % tracks.length;
      } else {
        index = (index - 1 + tracks.length) % tracks.length;
      }
      checked++;
    }
    
    // If all tracks have same artist, just return the next index
    return startIndex;
  };

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
      if (!currentTrack) return;
      setCurrentTrackIndex((prev) => {
        const sequentialPrev = (prev - 1 + tracks.length) % tracks.length;
        return findNextTrackWithDifferentArtist(sequentialPrev, currentTrack.artist, 'prev');
      });
      setIsPlaying(true);
    };
    const handleNext = () => {
      if (!currentTrack) return;
      setCurrentTrackIndex((prev) => {
        const sequentialNext = (prev + 1) % tracks.length;
        return findNextTrackWithDifferentArtist(sequentialNext, currentTrack.artist, 'next');
      });
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
        
        // Shuffle tracks randomly, but ensure no consecutive tracks from the same artist
        const shuffleWithArtistSeparation = (paths: string[]): string[] => {
          // First, extract artists for all paths
          const pathWithArtist = paths.map(path => ({
            path,
            artist: extractArtist(path)
          }));
          
          // Group by artist
          const artistGroups: { [artist: string]: string[] } = {};
          pathWithArtist.forEach(({ path, artist }) => {
            if (!artistGroups[artist]) {
              artistGroups[artist] = [];
            }
            artistGroups[artist].push(path);
          });
          
          // Shuffle each artist's tracks
          Object.keys(artistGroups).forEach(artist => {
            artistGroups[artist] = artistGroups[artist].sort(() => Math.random() - 0.5);
          });
          
          // Get all artists and shuffle them
          const artists = Object.keys(artistGroups).sort(() => Math.random() - 0.5);
          
          // Build shuffled list ensuring no consecutive same artist
          const shuffled: string[] = [];
          const artistIndices: { [artist: string]: number } = {};
          artists.forEach(artist => {
            artistIndices[artist] = 0;
          });
          
          // Keep track of last artist played
          let lastArtist: string | null = null;
          
          // Fill shuffled array
          while (shuffled.length < paths.length) {
            // Find available artists (not the last one played, and with remaining tracks)
            const availableArtists = artists.filter(artist => {
              if (artist === lastArtist) return false; // Can't use same artist twice in a row
              return artistIndices[artist] < artistGroups[artist].length;
            });
            
            // If no available artists (shouldn't happen, but handle edge case)
            if (availableArtists.length === 0) {
              // Reset and pick from any artist with remaining tracks
              const anyAvailable = artists.filter(artist => 
                artistIndices[artist] < artistGroups[artist].length
              );
              if (anyAvailable.length > 0) {
                const artist = anyAvailable[Math.floor(Math.random() * anyAvailable.length)];
                shuffled.push(artistGroups[artist][artistIndices[artist]++]);
                lastArtist = artist;
              }
              break;
            }
            
            // Pick a random artist from available ones
            const selectedArtist = availableArtists[Math.floor(Math.random() * availableArtists.length)];
            shuffled.push(artistGroups[selectedArtist][artistIndices[selectedArtist]++]);
            lastArtist = selectedArtist;
          }
          
          return shuffled;
        };
        
        const shuffled = shuffleWithArtistSeparation(trackPaths);
        
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

  // Initialize audio when track changes - different approach for mobile vs desktop
  useEffect(() => {
    if (tracks.length === 0 || !currentTrack) return;

    // Mobile: Use HTML5 Audio
    if (isMobile()) {
      const audio = audioRef.current;
      if (!audio) return;

      setSoundLoaded(false);
      
      // Clean up previous track
      audio.pause();
      audio.src = '';
      
      // Capture the current track index and artist at the time this handler is set up
      const trackIndexForHandler = currentTrackIndex;
      const trackArtistForHandler = currentTrack.artist;
      
      // Set up track end handler
      handleTrackEndRef.current = () => {
        // Only proceed if this handler is still for the current track
        // This prevents stale handlers from firing after a track change
        setCurrentTrackIndex((currentIndex) => {
          // If the current index has changed since this handler was set up, ignore it
          if (currentIndex !== trackIndexForHandler) {
            return currentIndex;
          }
          // Use the captured values to find the next track
          const sequentialNext = (trackIndexForHandler + 1) % tracks.length;
          const nextIndex = findNextTrackWithDifferentArtist(sequentialNext, trackArtistForHandler, 'next');
          return nextIndex;
        });
        setIsPlaying(true); // Auto-play next track
      };
      
      // Load new track
      audio.src = currentTrack.src;
      audio.playbackRate = playbackSpeed;
      
      const handleCanPlay = () => {
        setSoundLoaded(true);
        console.log('Track loaded (mobile):', currentTrack.title);
        if (isPlaying) {
          audio.play().catch((error) => {
            console.warn('Could not play track:', error);
          });
        }
      };
      
      const handleError = () => {
        console.error('Failed to load track:', currentTrack.src);
        setSoundLoaded(false);
      };
      
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      
      // Load the track
      audio.load();
      
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
    } 
    // Desktop: Use Pizzicato.js
    else {
      setSoundLoaded(false);
      
      // Clean up previous sound
      if (pizzicatoSoundRef.current) {
        pizzicatoSoundRef.current.stop();
        pizzicatoSoundRef.current = null;
      }
      
      // Capture the current track index and artist at the time this handler is set up
      const trackIndexForHandler = currentTrackIndex;
      const trackArtistForHandler = currentTrack.artist;
      
      // Create new Pizzicato sound
      const sound = new Sound(
        {
          source: 'file',
          options: {
            path: currentTrack.src,
            loop: false,
          },
        },
        (error?: Error) => {
          if (error) {
            console.error('Failed to load track:', error);
            setSoundLoaded(false);
          } else {
            setSoundLoaded(true);
            console.log('Track loaded (desktop):', currentTrack.title);
            
            // Set initial playback speed
            // Pizzicato doesn't support playbackRate directly, need to set on source node
            // We'll set it when the sound plays or update it dynamically
            
            // Set up reverb if enabled
            // Always remove existing effect first to prevent duplicates
            if (reverbEffectRef.current) {
              try {
                sound.removeEffect(reverbEffectRef.current);
              } catch (e) {
                // Ignore if not added
              }
            }
            
            if (reverb > 0) {
              // Create new reverb effect with longer delays to prevent feedback
              // Longer time/decay helps prevent feedback buildup
              reverbEffectRef.current = new Effects.Reverb({
                time: 2.5,        // Longer reverb tail
                decay: 2.0,       // Longer decay
                reverse: false,
                mix: Math.min(reverb * 0.4, 0.4), // Scale down mix (max 40% wet)
              });
              
              // Add the effect
              try {
                sound.addEffect(reverbEffectRef.current);
              } catch (e) {
                console.warn('Failed to add reverb effect:', e);
              }
            } else {
              reverbEffectRef.current = null;
            }
            
            // Set up event handlers
            // Note: We manage isPlaying state ourselves, so we don't set it from these events
            // to avoid conflicts. These are just for logging/debugging.
            sound.on('play', () => {
              console.log('Pizzicato play event fired');
              // Set playback rate when sound starts playing
              // The source node is created when play() is called
              setTimeout(() => {
                const soundAny = sound as any;
                // Try multiple ways to access the source node
                if (soundAny.source && soundAny.source.bufferSource) {
                  soundAny.source.bufferSource.playbackRate.value = playbackSpeed;
                  console.log('Set playbackRate on bufferSource:', playbackSpeed);
                } else if (soundAny.source && soundAny.source.sourceNode) {
                  soundAny.source.sourceNode.playbackRate.value = playbackSpeed;
                  console.log('Set playbackRate on sourceNode:', playbackSpeed);
                } else if (soundAny.sourceNode) {
                  soundAny.sourceNode.playbackRate.value = playbackSpeed;
                  console.log('Set playbackRate on sourceNode (direct):', playbackSpeed);
                } else if (soundAny.audioBufferSourceNode) {
                  soundAny.audioBufferSourceNode.playbackRate.value = playbackSpeed;
                  console.log('Set playbackRate on audioBufferSourceNode:', playbackSpeed);
                } else {
                  console.log('Could not find source node to set playbackRate');
                }
              }, 50);
            });
            sound.on('pause', () => {
              console.log('Pizzicato pause event fired');
            });
            sound.on('stop', () => {
              console.log('Pizzicato stop event fired');
            });
            sound.on('end', async () => {
              console.log('Pizzicato end event fired');
              // Track ended - move to next
              // Only proceed if this handler is still for the current track
              // This prevents stale handlers from firing after a track change
              setCurrentTrackIndex((currentIndex) => {
                // If the current index has changed since this handler was set up, ignore it
                if (currentIndex !== trackIndexForHandler) {
                  return currentIndex;
                }
                // Use the captured values to find the next track
                const sequentialNext = (trackIndexForHandler + 1) % tracks.length;
                const nextIndex = findNextTrackWithDifferentArtist(sequentialNext, trackArtistForHandler, 'next');
                return nextIndex;
              });
              // Resume AudioContext before auto-playing next track
              // Wait a bit for the new sound to load, then resume
              setTimeout(async () => {
                if (pizzicatoSoundRef.current) {
                  await resumePizzicatoContext(pizzicatoSoundRef.current);
                }
              }, 100);
              setIsPlaying(true); // Auto-play next track
            });
            
            pizzicatoSoundRef.current = sound;
            
            // Log sound object structure for debugging
            console.log('Sound object structure:', {
              hasMasterGainNode: !!(sound as any).masterGainNode,
              hasSource: !!(sound as any).source,
              masterGainNodeContext: (sound as any).masterGainNode?.context?.state,
              sourceContext: (sound as any).source?.context?.state,
              keys: Object.keys(sound as any),
            });
            
            // Try to resume context immediately after sound is loaded
            // This might help if the context was created during sound creation
            setTimeout(async () => {
              await resumePizzicatoContext(sound);
            }, 50);
            
            // Auto-play if should be playing (but only after user interaction)
            // Don't auto-play here - wait for user to click play button
            // This ensures AudioContext is resumed after user gesture
          }
        }
      );
      
      return () => {
        if (pizzicatoSoundRef.current) {
          pizzicatoSoundRef.current.stop();
          pizzicatoSoundRef.current = null;
        }
      };
    }
  }, [currentTrackIndex, tracks, currentTrack, isDesktop, playbackSpeed]);

  // Update playback speed - apply immediately when changed
  useEffect(() => {
    if (!soundLoaded) return;

    if (isMobile()) {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = playbackSpeed;
      }
    } else {
      const sound = pizzicatoSoundRef.current;
      if (sound) {
        // Pizzicato doesn't support playbackRate directly
        // Need to access the underlying AudioBufferSourceNode
        const soundAny = sound as any;
        
        // Try to access the source node (created when sound plays)
        if (soundAny.source && soundAny.source.bufferSource) {
          // AudioBufferSourceNode has playbackRate.value
          soundAny.source.bufferSource.playbackRate.value = playbackSpeed;
        } else if (soundAny.sourceNode) {
          soundAny.sourceNode.playbackRate.value = playbackSpeed;
        } else if (soundAny.audioBufferSourceNode) {
          soundAny.audioBufferSourceNode.playbackRate.value = playbackSpeed;
        } else {
          // If source node doesn't exist yet, store the speed to apply when it plays
          // We'll need to intercept the play method or set it in the play handler
          console.log('Source node not available yet, will apply on play');
        }
      }
    }
  }, [playbackSpeed, soundLoaded]);

  // Handle play/pause
  useEffect(() => {
    if (tracks.length === 0 || !soundLoaded) return;

    const handlePlay = async () => {
      try {
        if (isMobile()) {
          const audio = audioRef.current;
          if (!audio) return;
          
          if (isPlaying) {
            if (audio.paused) {
              audio.play().catch((error) => {
                console.warn('Could not play audio:', error);
              });
            }
          } else {
            if (!audio.paused) {
              audio.pause();
            }
          }
        } else {
          const sound = pizzicatoSoundRef.current;
          if (!sound) return;
          
          if (isPlaying) {
            if (!sound.playing) {
              // Resume AudioContext if suspended
              console.log('Attempting to resume AudioContext and play...');
              await resumePizzicatoContext(sound);
              try {
                sound.play();
                console.log('Play called on sound');
                // Set playback rate immediately after play
                setTimeout(() => {
                  const soundAny = sound as any;
                  if (soundAny.source && soundAny.source.bufferSource) {
                    soundAny.source.bufferSource.playbackRate.value = playbackSpeed;
                  } else if (soundAny.source && soundAny.source.sourceNode) {
                    soundAny.source.sourceNode.playbackRate.value = playbackSpeed;
                  } else if (soundAny.sourceNode) {
                    soundAny.sourceNode.playbackRate.value = playbackSpeed;
                  } else if (soundAny.audioBufferSourceNode) {
                    soundAny.audioBufferSourceNode.playbackRate.value = playbackSpeed;
                  }
                }, 50);
              } catch (error) {
                console.error('Error calling play on sound:', error);
              }
            }
          } else {
            if (sound.playing) {
              sound.pause();
            }
          }
        }
      } catch (error) {
        console.error('Error controlling playback:', error);
      }
    };

    handlePlay();
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

  const togglePlayPause = async () => {
    // Resume AudioContext on desktop before playing (required after user gesture)
    if (!isMobile() && pizzicatoSoundRef.current) {
      console.log('togglePlayPause: Resuming AudioContext...');
      await resumePizzicatoContext(pizzicatoSoundRef.current);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = async () => {
    // Stop current audio immediately before changing tracks
    if (isMobile()) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
      }
    } else {
      const sound = pizzicatoSoundRef.current;
      if (sound) {
        sound.stop(); // Stop immediately
      }
    }
    // Change track index (this will trigger track reload)
    if (!currentTrack) return;
    setCurrentTrackIndex((prev) => {
      const sequentialNext = (prev + 1) % tracks.length;
      return findNextTrackWithDifferentArtist(sequentialNext, currentTrack.artist, 'next');
    });
    setIsPlaying(true);
  };

  const handlePrevious = async () => {
    // Stop current audio immediately before changing tracks
    if (isMobile()) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
      }
    } else {
      const sound = pizzicatoSoundRef.current;
      if (sound) {
        sound.stop(); // Stop immediately
      }
    }
    // Change track index (this will trigger track reload)
    if (!currentTrack) return;
    setCurrentTrackIndex((prev) => {
      const sequentialPrev = (prev - 1 + tracks.length) % tracks.length;
      return findNextTrackWithDifferentArtist(sequentialPrev, currentTrack.artist, 'prev');
    });
    setIsPlaying(true);
  };

  // Volume control removed - always at 1.0

  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    
    // Update immediately for better UX
    if (isMobile()) {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = newSpeed;
      }
    } else {
      const sound = pizzicatoSoundRef.current;
      if (sound) {
        // Pizzicato doesn't support playbackRate directly
        // Need to access the underlying AudioBufferSourceNode
        const soundAny = sound as any;
        
        // Try multiple ways to access the source node
        if (soundAny.source && soundAny.source.bufferSource) {
          soundAny.source.bufferSource.playbackRate.value = newSpeed;
        } else if (soundAny.sourceNode) {
          soundAny.sourceNode.playbackRate.value = newSpeed;
        } else if (soundAny.audioBufferSourceNode) {
          soundAny.audioBufferSourceNode.playbackRate.value = newSpeed;
        } else {
          // If not playing yet, the source node will be created on play
          // The play handler will set it
          console.log('Source node not available, will apply on play');
        }
      }
    }
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newReverb = parseFloat(e.target.value);
    setReverb(newReverb);
  };


  const selectTrack = async (index: number) => {
    // Stop current audio immediately before changing tracks
    if (isMobile()) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0; // Reset to beginning
      }
      // Clear the end handler to prevent it from firing with stale values
      handleTrackEndRef.current = null;
    } else {
      const sound = pizzicatoSoundRef.current;
      if (sound) {
        sound.stop(); // Stop immediately
      }
    }
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setShowPlaylist(false);
  };

  // Show genre selection screen
  if (!selectedGenre) {
    return (
      <div className="slomo-container genre-selection">
        <div className="bartender-background" style={{ backgroundImage: `url(${bartenderImage})` }}></div>
        <div className="genre-selection-content">
          <h1>playlists</h1>
          <p>randomized slo mo playlists insired by the chopped, the screwed and the g🐐ated <a href="https://youtu.be/adaTEdqR4xI?si=kLuG-OzSM3qHGGvN" target="_blank">Caretaker</a></p>   
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

        {/* Reverb Control - Desktop only */}
        {isDesktop && (
          <div className="speed-section">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="speed-icon">
              {/* Spring icon - vertical coiled spring */}
              <path d="M12 2c-2 0-4 1.5-4 3.5s2 3.5 4 3.5 4-1.5 4-3.5-2-3.5-4-3.5z" />
              <path d="M12 9c-2 0-4 1.5-4 3.5s2 3.5 4 3.5 4-1.5 4-3.5-2-3.5-4-3.5z" />
              <path d="M12 16c-2 0-4 1.5-4 3.5s2 3.5 4 3.5 4-1.5 4-3.5-2-3.5-4-3.5z" />
              <line x1="8" y1="5.5" x2="8" y2="8.5" />
              <line x1="16" y1="5.5" x2="16" y2="8.5" />
              <line x1="8" y1="12.5" x2="8" y2="15.5" />
              <line x1="16" y1="12.5" x2="16" y2="15.5" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={reverb}
              onChange={handleReverbChange}
              className="speed-bar"
            />
            <span className="speed-value">{Math.round(reverb * 100)}%</span>
          </div>
        )}


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
