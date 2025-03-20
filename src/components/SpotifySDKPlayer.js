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
      setError(`Playback error: ${message}`);
    });

    // Ready state handling
    newPlayer.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready with device ID:', device_id);
      setDeviceId(device_id);
      setIsReady(true);
      setIsLoading(false);
      
      // Automatically transfer playback to this device
      if (currentEpisodeId) {
        transferPlayback(device_id, currentEpisodeId, currentTimestamp);
      }
    });

    // Not ready state handling
    newPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID is no longer ready:', device_id);
      setIsReady(false);
    });

    // State updates
    newPlayer.addListener('player_state_changed', (state) => {
      if (!state) {
        console.log('No player state available');
        return;
      }
      
      setIsPaused(state.paused);
      
      // Update playback position (in milliseconds)
      const elapsedMs = state.position;
      const durationMs = state.duration;
      
      // Get current track details
      if (state.track_window?.current_track) {
        setCurrentTrack({
          name: state.track_window.current_track.name,
          artists: state.track_window.current_track.artists.map(artist => artist.name).join(', '),
          image: state.track_window.current_track.album.images[0]?.url,
          elapsedMs: elapsedMs,
          durationMs: durationMs,
          elapsedFormatted: formatTime(Math.floor(elapsedMs / 1000)),
          durationFormatted: formatTime(Math.floor(durationMs / 1000))
        });
      }
    });

    // Connect to the player
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

  // Function to transfer playback to this device
  const transferPlayback = async (deviceId, episodeId, timeMs) => {
    if (!deviceId || !episodeId) return;
    
    try {
      console.log(`Transferring playback to device ${deviceId} for episode ${episodeId} at ${timeMs}ms`);
      setTransferringPlayback(true);
      
      // First make this the active device
      await fetch('https://api.spotify.com/v1/me/player', {
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
      
      // Wait a moment for the device activation to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then play the specific content
      await fetch('https://api.spotify.com/v1/me/player/play', {
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
      
      console.log('Playback transfer successful');
      setIsPaused(false);
    } catch (error) {
      console.error('Error transferring playback:', error);
      setError(`Could not play on this device: ${error.message}`);
    } finally {
      setTransferringPlayback(false);
    }
  };

  // Listen for timestamp click events
  useEffect(() => {
    const handleTimestampClick = async (event) => {
      const { episodeId, timestamp } = event.detail;
      console.log('Timestamp clicked:', episodeId, timestamp);
      
      if (!episodeId) {
        console.error('No episode ID provided');
        return;
      }
      
      setCurrentEpisodeId(episodeId);
      setCurrentTimestamp(timestamp);
      setIsLoading(true);
      
      // If the player is ready, transfer playback to it
      if (isReady && deviceId) {
        await transferPlayback(deviceId, episodeId, timestamp);
      } else {
        // Store the episode and timestamp for when the player becomes ready
        console.log('Player not ready yet, storing episode info for later');
      }
      
      setIsLoading(false);
    };
    
    window.addEventListener('spotify-timestamp-click', handleTimestampClick);
    
    return () => {
      window.removeEventListener('spotify-timestamp-click', handleTimestampClick);
    };
  }, [isReady, deviceId, accessToken]);

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
    <div className="fixed bottom-10 left-10 right-0 h-auto bg-white shadow-lg z-50 rounded-lg w-[40vw]">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {isLoading || transferringPlayback ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-rose-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">
                  {transferringPlayback ? 'Preparing to play...' : 'Loading player...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span className="text-sm font-medium mr-2">
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            {error.includes('Premium') && (
              <p className="text-sm mt-1">Note: Spotify Web Playback SDK requires a Spotify Premium subscription.</p>
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
                className="text-sm px-3 py-1 bg-indigo-600 text-white rounded"
              >
                Retry Connection
              </button>
              <a 
                href="https://open.spotify.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-sm px-3 py-1 bg-green-600 text-white rounded"
              >
                Open Spotify Web
              </a>
            </div>
          </div>
        )}
        
        {currentTrack ? (
          <div className="flex items-center mb-4">
            {currentTrack.image && (
              <img src={currentTrack.image} alt="Album art" className="w-16 h-16 rounded mr-4" />
            )}
            <div className="flex-1">
              <h3 className="font-medium">{currentTrack.name}</h3>
              <p className="text-gray-600 text-sm">{currentTrack.artists}</p>
              
              {/* Custom time display showing elapsed time */}
              <div className="mt-2 flex items-center">
                <div className="text-sm font-medium text-green-600 mr-2">
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
                <div className="text-sm font-medium text-gray-500 ml-2">
                  {currentTrack.durationFormatted}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center text-gray-500">
            {!currentEpisodeId ? 
              "Click on a timestamp to start playing" : 
              "Preparing to play your podcast..."}
          </div>
        )}
        
        <div className="flex justify-center mb-2">
          <button 
            onClick={togglePlay}
            className={`rounded-full p-3 focus:outline-none ${currentTrack ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={!currentTrack || !isReady}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
        
        <div className="text-center text-xs text-gray-500">
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