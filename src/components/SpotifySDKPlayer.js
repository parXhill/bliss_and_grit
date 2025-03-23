'use client';

import { useState, useEffect, useRef } from 'react';

const SpotifySDKPlayer = ({ 
  isVisible, 
  onClose,
  accessToken
}) => {
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [transferringPlayback, setTransferringPlayback] = useState(false);
  
  // Add a ref to track if a transfer is in progress to prevent duplicates
  const transferInProgress = useRef(false);
  // Add a ref to track the last requested episode/timestamp to prevent duplicates
  const lastPlayRequest = useRef({ episodeId: null, timestamp: null });
  
  // Helper function to format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Load the Spotify SDK script
  useEffect(() => {
    if (!isVisible || !accessToken) return;
    
    // Only load the script once
    if (!document.getElementById('spotify-player-script')) {
      console.log('Loading Spotify Web Playback SDK script...');
      setIsLoading(true);
      
      const script = document.createElement("script");
      script.id = 'spotify-player-script';
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
      
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('Spotify Web Playback SDK is ready');
        setSdkLoaded(true);
      };
    } else if (window.Spotify) {
      console.log('SDK script already loaded');
      setSdkLoaded(true);
    }
    
    return () => {
      // Disconnect player on unmount if it exists
      if (player) {
        console.log('Disconnecting Spotify player');
        player.disconnect();
      }
    };
  }, [isVisible, accessToken]);

  // Initialize player when SDK is loaded and token is available
  useEffect(() => {
    if (!sdkLoaded || !accessToken || player) return;
    
    console.log('Initializing Spotify player with token...');
    
    const newPlayer = new window.Spotify.Player({
      name: 'Podcast Explorer Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });
    
    // Error handling
    newPlayer.addListener('initialization_error', ({ message }) => {
      console.error('Initialization error:', message);
      setError(`Initialization error: ${message}`);
    });

    newPlayer.addListener('authentication_error', ({ message }) => {
      console.error('Authentication error:', message);
      setError(`Authentication error: ${message}`);
    });

    newPlayer.addListener('account_error', ({ message }) => {
      console.error('Account error:', message);
      setError(`Account error: ${message} (Premium required)`);
    });

    newPlayer.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
      // Ignore the "PlayLoad event failed" error since it doesn't affect playback
      if (!message.includes('PlayLoad event failed')) {
        setError(`Playback error: ${message}`);
      }
    });

    // Ready state handling with debounce to prevent double initialization
    newPlayer.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready with device ID:', device_id);
      setDeviceId(device_id);
      
      // Add a longer delay on first load to ensure the player is fully ready
      const readyDelay = isFirstLoad ? 1000 : 300;
      
      // Add a small delay before declaring player ready to ensure all systems are go
      setTimeout(() => {
        setIsReady(true);
        setIsLoading(false);
        
        // Automatically transfer playback to this device if needed
        if (currentEpisodeId) {
          // We need a slightly longer delay before playing on first load
          setTimeout(() => {
            transferPlayback(device_id, currentEpisodeId, currentTimestamp);
          }, isFirstLoad ? 500 : 0);
        }
      }, readyDelay);
    });

    // Not ready state handling
    newPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID is no longer ready:', device_id);
      setIsReady(false);
      transferInProgress.current = false; // Reset transfer status
    });

    newPlayer.addListener('player_state_changed', (state) => {
      if (!state) {
        console.log('No player state available');
        return;
      }
      
      setIsPaused(state.paused);
      
      // Update playback position (in milliseconds)
      const elapsedMs = state.position;
      const durationMs = state.duration;
      
      // Check if this is a podcast/episode
      const isEpisode = state.track_window?.current_track?.type === 'episode';
      
      // For debugging
      console.log('Player state changed:', {
        trackType: state.track_window?.current_track?.type,
        trackName: state.track_window?.current_track?.name,
        paused: state.paused,
        isEpisode
      });
      
      // Get current track details
      if (state.track_window?.current_track) {
        // Extract track URI to get episode ID if it's an episode
        const trackUri = state.track_window.current_track.uri || '';
        const episodeIdMatch = trackUri.match(/spotify:episode:(.+)$/);
        
        if (episodeIdMatch && episodeIdMatch[1]) {
          console.log('Episode ID from state change:', episodeIdMatch[1]);
          setCurrentEpisodeId(episodeIdMatch[1]);
        }
        
        setCurrentTrack({
          name: state.track_window.current_track.name,
          artists: isEpisode 
            ? state.track_window.current_track.album.name || 'Podcast'
            : state.track_window.current_track.artists.map(artist => artist.name).join(', '),
          image: state.track_window.current_track.album.images[0]?.url,
          elapsedMs: elapsedMs,
          durationMs: durationMs,
          elapsedFormatted: formatTime(Math.floor(elapsedMs / 1000)),
          durationFormatted: formatTime(Math.floor(durationMs / 1000))
        });
      }
    });

    // Connect to the player with better error handling
    console.log('Connecting to Spotify...');
    newPlayer.connect()
      .then(success => {
        if (success) {
          console.log('Connected to Spotify successfully');
          setPlayer(newPlayer);
        } else {
          console.error('Failed to connect to Spotify');
          setError('Failed to connect to Spotify. Please try again.');
        }
      })
      .catch(err => {
        console.error('Error connecting to Spotify:', err);
        setError(`Connection error: ${err.message}`);
      });
      
    return () => {
      newPlayer.disconnect();
    };
  }, [sdkLoaded, accessToken]);

  const fetchAndUpdateCurrentEpisode = async (episodeId) => {
    try {
      // Get episode details from Spotify API
      const response = await fetch(`https://api.spotify.com/v1/episodes/${episodeId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch episode details: ${response.status}`);
        return;
      }
      
      const episodeData = await response.json();
      console.log('Successfully fetched episode details:', episodeData);
      
      // Manually update the currentTrack state with episode details
      setCurrentTrack({
        name: episodeData.name,
        artists: episodeData.show?.name || 'Podcast',
        image: episodeData.images?.[0]?.url,
        elapsedMs: episodeData.resume_point?.resume_position_ms || 0,
        durationMs: episodeData.duration_ms || 0,
        elapsedFormatted: formatTime(Math.floor((episodeData.resume_point?.resume_position_ms || 0) / 1000)),
        durationFormatted: formatTime(Math.floor((episodeData.duration_ms || 0) / 1000))
      });
      
      // Request a getState from the player to force a UI refresh
      if (player) {
        player.getCurrentState().then(state => {
          if (state) {
            console.log('Player state updated after episode change');
          } else {
            console.log('Player state not available yet');
          }
        });
      }
    } catch (error) {
      console.error('Error fetching episode details:', error);
    }
  };
  
  // Retry playback function
  const retryPlayback = async (deviceId, episodeId, timeMs, retryCount = 0) => {
    if (retryCount > 2) {
      console.warn('Max retry attempts reached for playback');
      return;
    }
    
    try {
      console.log(`Retry attempt ${retryCount + 1} for episode ${episodeId}`);
      
      // Wait a bit longer between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [`spotify:episode:${episodeId}`],
          position_ms: timeMs * 1000
        })
      });
      
      if (!playResponse.ok) {
        throw new Error(`Retry failed with status: ${playResponse.status}`);
      }
      
      console.log('Retry playback successful');
      await fetchAndUpdateCurrentEpisode(episodeId);
      setIsPaused(false);
    } catch (error) {
      console.error(`Retry attempt ${retryCount + 1} failed:`, error);
      // Recursive retry with increased count
      if (retryCount < 2) {
        await retryPlayback(deviceId, episodeId, timeMs, retryCount + 1);
      }
    }
  };
  
  // Modified transferPlayback function with proper state synchronization and duplicate prevention
  const transferPlayback = async (deviceId, episodeId, timeMs) => {
    // Add duplicate request protection
    if (
      lastPlayRequest.current.episodeId === episodeId && 
      lastPlayRequest.current.timestamp === timeMs &&
      Date.now() - lastPlayRequest.current.time < 2000
    ) {
      console.log('Duplicate play request ignored');
      return;
    }
    
    // Update last request
    lastPlayRequest.current = { 
      episodeId, 
      timestamp: timeMs, 
      time: Date.now() 
    };
    
    if (!deviceId || !episodeId) {
      console.error('Missing deviceId or episodeId for playback');
      return;
    }
    
    // Check if a transfer is already in progress
    if (transferInProgress.current) {
      console.log('Transfer already in progress, aborting new request');
      return;
    }
    
    transferInProgress.current = true;
    
    try {
      console.log(`Transferring playback to device ${deviceId} for episode ${episodeId} at ${timeMs}ms`);
      setTransferringPlayback(true);
      
      // First, update the component state to reflect the requested episode
      setCurrentEpisodeId(episodeId);
      
      // For first load or if we're still initializing, try two-step process first
      if (isFirstLoad || !player || !isReady) {
        console.log('Using two-step process for first load or initialization');
        
        try {
          // Step 1: Set active device
          const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              device_ids: [deviceId],
              play: false
            })
          });
          
          if (!transferResponse.ok) {
            console.warn(`Device transfer failed with status: ${transferResponse.status}, but continuing anyway`);
          }
          
          // Wait for device transfer to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Step 2: Play content
          const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uris: [`spotify:episode:${episodeId}`],
              position_ms: timeMs * 1000
            })
          });
          
          if (!playResponse.ok) {
            throw new Error(`Play content failed with status: ${playResponse.status}`);
          }
          
          console.log('Two-step playback successful on first load');
          
          // Important: fetch episode details to update UI manually
          await fetchAndUpdateCurrentEpisode(episodeId);
          setIsPaused(false);
          return;
        } catch (twoStepError) {
          console.log('Two-step approach failed, trying direct play:', twoStepError);
          // Fall through to direct play approach
        }
      }
      
      // Try direct play approach (default for non-first loads)
      try {
        // Add a small delay before the API call to ensure the SDK is ready
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [`spotify:episode:${episodeId}`],
            position_ms: timeMs * 1000
          })
        });
        
        if (!playResponse.ok) {
          console.log(`Direct play failed with status: ${playResponse.status}. Will try retry mechanism.`);
          throw new Error('Direct play failed');
        }
        
        console.log('Direct play successful');
        
        // Important: fetch episode details to update UI manually
        await fetchAndUpdateCurrentEpisode(episodeId);
        
        setIsPaused(false);
        return;
      } catch (directPlayError) {
        console.log('Direct play failed, trying retry mechanism');
        // Call the retry function here
        await retryPlayback(deviceId, episodeId, timeMs);
        return; // Return after retry attempts
      }
      
    } catch (error) {
      console.error('Error transferring playback:', error);
      // Ignore 404 errors from PlayLoad event failures since they don't affect playback
      if (!error.message?.includes('PlayLoad event failed')) {
        setError(`Playback error: ${error.message}`);
      }
    } finally {
      setTransferringPlayback(false);
      transferInProgress.current = false;
    }
  };

  // Track first load state
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const firstPlayAttemptRef = useRef(false);

  // Listen for timestamp click events with debounce to prevent double firing
  useEffect(() => {
    let timeoutId = null;
    
    const handleTimestampClick = async (event) => {
      const { episodeId, timestamp } = event.detail;
      console.log('Timestamp clicked:', episodeId, timestamp);
      
      if (!episodeId) {
        console.error('No episode ID provided');
        return;
      }
      
      // Clear any existing timeout to implement debounce
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set a timeout to handle the click event
      timeoutId = setTimeout(async () => {
        setCurrentEpisodeId(episodeId);
        setCurrentTimestamp(timestamp);
        setIsLoading(true);
        
        // Check if this is the first play attempt
        const isFirstPlayAttempt = isFirstLoad && !firstPlayAttemptRef.current;
        firstPlayAttemptRef.current = true;
        
        if (isFirstPlayAttempt) {
          console.log('First play attempt - using enhanced initialization');
          
          // For first load, wait a bit longer and ensure SDK is fully initialized
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // First try - direct play with retry
          if (deviceId) {
            try {
              await transferPlayback(deviceId, episodeId, timestamp);
              // If successful, mark first load as complete
              setIsFirstLoad(false);
            } catch (err) {
              console.log('First attempt failed, will retry shortly');
              
              // Second attempt with more delay
              setTimeout(async () => {
                try {
                  if (deviceId) {
                    await transferPlayback(deviceId, episodeId, timestamp);
                  }
                  setIsFirstLoad(false);
                } catch (retryErr) {
                  console.error('Retry also failed:', retryErr);
                } finally {
                  setIsLoading(false);
                }
              }, 2000);
            }
          }
        } else if (isReady && deviceId) {
          // Normal flow for subsequent plays
          await transferPlayback(deviceId, episodeId, timestamp);
        } else {
          // Store the episode and timestamp for when the player becomes ready
          console.log('Player not ready yet, storing episode info for later');
        }
        
        setIsLoading(false);
      }, 300); // 300ms debounce
    };
    
    window.addEventListener('spotify-timestamp-click', handleTimestampClick);
    
    return () => {
      window.removeEventListener('spotify-timestamp-click', handleTimestampClick);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isReady, deviceId, accessToken, isFirstLoad]);

  // Add a timer to update progress periodically even when no state change events come in
  useEffect(() => {
    let progressTimer = null;
    
    if (isReady && currentTrack && !isPaused) {
      // Update elapsed time every second when playing
      progressTimer = setInterval(() => {
        setCurrentTrack(prevTrack => {
          if (!prevTrack) return null;
          
          const newElapsedMs = Math.min(prevTrack.elapsedMs + 1000, prevTrack.durationMs);
          return {
            ...prevTrack,
            elapsedMs: newElapsedMs,
            elapsedFormatted: formatTime(Math.floor(newElapsedMs / 1000))
          };
        });
      }, 1000);
    }
    
    return () => {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    };
  }, [isReady, currentTrack, isPaused]);

  // Player controls
  const togglePlay = async () => {
    if (player) {
      await player.togglePlay();
    }
  };

  // Seek to specific position
  const seekToPosition = async (positionPercent) => {
    if (player && currentTrack) {
      const positionMs = Math.floor(currentTrack.durationMs * (positionPercent / 100));
      await player.seek(positionMs);
    }
  };
  
  // Handle close properly - pause playback and then close
  const handleClose = () => {
    // Pause playback when closing
    if (player && !isPaused) {
      player.pause().then(() => {
        onClose(); // Call the original onClose function after pausing
      }).catch(err => {
        console.error('Error pausing on close:', err);
        onClose(); // Still close even if pause fails
      });
    } else {
      onClose();
    }
  };

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-10 md:right-auto md:w-2/5 h-auto bg-[#773C40] shadow-lg z-50 rounded-none md:rounded-lg opacity-95">
      <div className="container mx-auto p-2 md:p-4">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex items-center">
            {isLoading || transferringPlayback ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-rose-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs md:text-sm font-medium">
                  {transferringPlayback ? 'Preparing to play...' : 'Loading player...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span className="text-xs md:text-sm font-medium mr-2">
                  {isReady ? 'Connected to Spotify' : 'Connecting...'}
                </span>
              </div>
            )}
          </div>
          
          <button 
            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            onClick={handleClose}
            aria-label="Close player"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-2 md:px-4 md:py-3 rounded mb-2 md:mb-4">
            <p className="text-xs md:text-base">{error}</p>
            {error.includes('Premium') && (
              <p className="text-xs mt-1">Note: Spotify Web Playback SDK requires a Spotify Premium subscription.</p>
            )}
            <div className="mt-2 flex space-x-3">
              <button 
                onClick={() => {
                  if (player) player.disconnect();
                  if (window.Spotify) {
                    const newPlayer = new window.Spotify.Player({
                      name: 'Podcast Explorer Player',
                      getOAuthToken: cb => { cb(accessToken); },
                      volume: 0.5
                    });
                    newPlayer.connect().then(() => {
                      setPlayer(newPlayer);
                      setError(null);
                    });
                  }
                }}
                className="text-xs md:text-sm px-2 py-1 md:px-3 md:py-1 bg-indigo-600 text-white rounded"
              >
                Retry Connection
              </button>
              <a 
                href="https://open.spotify.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs md:text-sm px-2 py-1 md:px-3 md:py-1 bg-green-600 text-white rounded"
              >
                Open Spotify Web
              </a>
            </div>
          </div>
        )}

        
        
        {currentTrack ? (
          <div className="flex items-center mb-2 md:mb-4">

          
            
            {currentTrack.image && (
              <img src={currentTrack.image} alt="Album art" className="w-12 h-12 md:w-16 md:h-16 rounded mr-2 md:mr-4" />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-white text-sm md:text-base truncate">{currentTrack.name}</h3>
              <p className="text-gray-500 text-xs md:text-sm truncate">{currentTrack.artists}</p>
              
              {/* Custom time display showing elapsed time */}
              <div className="mt-1 md:mt-2 flex items-center">
                <div className="text-xs md:text-sm font-medium text-green-600 mr-1 md:mr-2">
                  {currentTrack.elapsedFormatted}
                </div>
                <div 
                className="relative flex-1 h-1 bg-gray-200 rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPosition = e.clientX - rect.left;
                  const percent = (clickPosition / rect.width) * 100;
                  seekToPosition(percent);
                }}
              >
                <div 
                  className="absolute h-1 bg-green-500 rounded-full" 
                  style={{ 
                    width: `${(currentTrack.elapsedMs / currentTrack.durationMs) * 100}%` 
                  }}
                ></div>
              </div>
                <div className="text-xs md:text-sm font-medium text-gray-500 ml-1 md:ml-2">
                  {currentTrack.durationFormatted}
                </div>
              </div>
            </div>


            <div className="flex justify-center ml-2 md:mb-2">
          <button 
            onClick={togglePlay}
            className={`rounded-full p-2 md:p-3 focus:outline-none ${currentTrack ? 'bg-black cursor-pointer hover:bg-green-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={!currentTrack || !isReady}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>


          </div>
        ) : (
          <div className="py-2 md:py-3 text-center text-gray-500">
            {!currentEpisodeId ? 
              "" : 
              ""}
          </div>
        )}
        
  
        
        <div className="text-center text-sm md:text-lg text-white">
          {!isReady && !error && (
            <>
              <div className="animate-pulse">Initializing Spotify player...</div>
              <div className="mt-1 text-xs">
                <a 
                  href="https://open.spotify.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-green-600 hover:underline"
                >
                  Try opening Spotify Web first
                </a>
              </div>
            </>
          )}
          {isReady && !currentTrack && !error && 'Ready to play. Click on a timestamp to start.'}
        </div>
      </div>
    </div>
  );
};

export default SpotifySDKPlayer;