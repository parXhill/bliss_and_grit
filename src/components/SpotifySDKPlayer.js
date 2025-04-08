'use client';

import { useState, useEffect } from 'react';

const SpotifySDKPlayer = ({ isVisible, onClose, accessToken }) => {
  // Consolidated state - much fewer variables
  const [playerState, setPlayerState] = useState({
    isLoading: false,
    isReady: false,
    error: null,
    deviceId: null
  });
  
  const [playbackInfo, setPlaybackInfo] = useState({
    currentEpisodeId: null,
    isPaused: true,
    track: null,
    progress: 0,
    duration: 0
  });
  
  // Single player reference
  const [player, setPlayer] = useState(null);
  
  // Helper function for time formatting
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. SDK LOADING
  useEffect(() => {
    if (!isVisible || !accessToken) return;
    
    // Don't reload if already loaded
    if (document.getElementById('spotify-player-script')) {
      return;
    }
    
    console.log('Loading Spotify SDK...');
    setPlayerState(prev => ({ ...prev, isLoading: true }));
    
    const script = document.createElement("script");
    script.id = 'spotify-player-script';
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
    
    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer(accessToken);
    };
    
    return () => {
      if (player) player.disconnect();
    };
  }, [isVisible, accessToken]);
  
  // 2. PLAYER INITIALIZATION - simplified into a function
  const initializePlayer = (token) => {
    console.log('Initializing Spotify player...');
    
    const newPlayer = new window.Spotify.Player({
      name: 'Podcast Explorer Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.5
    });
    
    // Simplified error handling - one handler for all errors
    const handleError = (error) => {
      console.error('Spotify player error:', error);
      setPlayerState(prev => ({ 
        ...prev, 
        error: error.message || 'An unknown error occurred',
        isLoading: false
      }));
    };
    
    newPlayer.addListener('initialization_error', handleError);
    newPlayer.addListener('authentication_error', handleError);
    newPlayer.addListener('account_error', handleError);
    newPlayer.addListener('playback_error', handleError);
    
    // Ready handler
    newPlayer.addListener('ready', ({ device_id }) => {
      console.log('Spotify player ready:', device_id);
      setPlayerState(prev => ({ 
        ...prev, 
        deviceId: device_id, 
        isReady: true,
        isLoading: false 
      }));
    });
    
    // Not ready handler 
    newPlayer.addListener('not_ready', () => {
      setPlayerState(prev => ({ ...prev, isReady: false }));
    });
    
    // Playback state handler - simplified
    newPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      const isPaused = state.paused;
      const currentTrack = state.track_window?.current_track;
      
      if (currentTrack) {
        setPlaybackInfo({
          isPaused,
          track: {
            name: currentTrack.name,
            artists: currentTrack.type === 'episode' 
              ? currentTrack.album.name 
              : currentTrack.artists.map(artist => artist.name).join(', '),
            image: currentTrack.album.images[0]?.url,
          },
          progress: state.position,
          duration: state.duration,
          currentEpisodeId: currentTrack.uri.split(':')[2]
        });
        
        // When we receive a state update and isPaused is false, 
        // we know playback has actually started
        if (!isPaused) {
          setPlayerState(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
    
    // Connect
    newPlayer.connect()
      .then(success => {
        if (success) {
          setPlayer(newPlayer);
        } else {
          handleError({ message: 'Failed to connect to Spotify' });
        }
      })
      .catch(handleError);
  };
  
  // 3. TIMESTAMP EVENT LISTENER - simplified 
  useEffect(() => {
    const handleTimestampClick = (event) => {
      const { episodeId, timestamp } = event.detail;
      if (!episodeId || !playerState.deviceId || !playerState.isReady) return;
      
      console.log('Playing episode:', episodeId, 'at', timestamp);
      setPlayerState(prev => ({ ...prev, isLoading: true }));
      
      // Single playback method - no retries or fallbacks
      playEpisode(playerState.deviceId, episodeId, timestamp);
    };
    
    window.addEventListener('spotify-timestamp-click', handleTimestampClick);
    return () => window.removeEventListener('spotify-timestamp-click', handleTimestampClick);
  }, [playerState.deviceId, playerState.isReady]);
  
  // 4. SIMPLIFIED PLAYBACK FUNCTION
  const playEpisode = async (deviceId, episodeId, timeMs) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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
      
      if (!response.ok) {
        throw new Error(`Failed to play: ${response.status}`);
      }
      
      // Store the requested episode ID but don't update isPaused yet
      // We'll let the player_state_changed event confirm when audio is actually playing
      setPlaybackInfo(prev => ({ 
        ...prev, 
        currentEpisodeId: episodeId 
      }));
      
      // Keep loading state active until playback actually starts
      // The loading state will be cleared in player_state_changed when isPaused becomes false
    } catch (error) {
      console.error('Playback error:', error);
      setPlayerState(prev => ({ 
        ...prev, 
        error: `Playback error: ${error.message}`,
        isLoading: false 
      }));
    }
  };
  
  // 5. PROGRESS TRACKING - simplified timer
  useEffect(() => {
    let progressTimer;
    
    if (playbackInfo.track && !playbackInfo.isPaused) {
      progressTimer = setInterval(() => {
        setPlaybackInfo(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 1000, prev.duration)
        }));
      }, 1000);
    }
    
    return () => clearInterval(progressTimer);
  }, [playbackInfo.track, playbackInfo.isPaused]);
  
  // 6. PLAYER CONTROLS - simplified
  const togglePlay = () => {
    if (player) player.togglePlay();
  };
  
  const seekToPosition = (percent) => {
    if (player && playbackInfo.duration) {
      const position = Math.floor(playbackInfo.duration * (percent / 100));
      player.seek(position);
    }
  };
  
  const handleClose = () => {
    if (player && !playbackInfo.isPaused) {
      player.pause().then(onClose);
    } else {
      onClose();
    }
  };
  
  // Don't render if not visible
  if (!isVisible) return null;
  
  // 7. SIMPLIFIED UI
  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-10 md:right-auto md:w-full bg-[#773C40] shadow-lg z-50 rounded-none md:rounded-lg opacity-95">
      <div className="p-3 md:p-4">
        {/* Header with status and close button */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            {playerState.isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-rose-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Loading...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span className="text-sm font-medium">
                  {playerState.isReady ? 'Connected' : 'Connecting...'}
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
        
        {/* Error message */}
        {playerState.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3 text-sm">
            {playerState.error}
            {playerState.error.includes('Premium') && (
              <p className="text-xs mt-1">Note: Spotify Web Playback requires a Premium subscription.</p>
            )}
          </div>
        )}
        
        {/* Track information and controls */}
        {playbackInfo.track ? (
          <div className="flex items-center mb-3">
            {playbackInfo.track.image && (
              <img src={playbackInfo.track.image} alt="Album art" className="w-14 h-14 rounded mr-3" />
            )}
            
            <div className="flex-1">
              <h3 className="font-medium text-white text-base truncate">
                {playbackInfo.track.name}
              </h3>
              <p className="text-gray-300 text-sm truncate">
                {playbackInfo.track.artists}
              </p>
              
              {/* Progress bar */}
              <div className="mt-2 flex items-center">
                <div className="text-xs font-medium text-green-400 mr-2">
                  {formatTime(Math.floor(playbackInfo.progress / 1000))}
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
                      width: `${(playbackInfo.progress / playbackInfo.duration) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="text-xs font-medium text-gray-300 ml-2">
                  {formatTime(Math.floor(playbackInfo.duration / 1000))}
                </div>
              </div>
            </div>
            
            {/* Play/pause button */}
            <button 
              onClick={togglePlay}
              className="rounded-full p-3 bg-black hover:bg-green-600 text-white ml-3"
              disabled={!playerState.isReady}
            >
              {playbackInfo.isPaused ? (
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
        ) : (
          <div className="py-4 text-center text-white">
            {playerState.isReady ? 'Click on a timestamp to play' : 'Initializing player...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifySDKPlayer;