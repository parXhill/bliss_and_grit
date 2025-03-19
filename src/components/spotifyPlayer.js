'use client';

import { useState, useEffect, useRef } from 'react';

const SpotifyPlayer = ({ isVisible, onClose }) => {
  const [currentEpisodeId, setCurrentEpisodeId] = useState(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  // Listen for timestamp click events and update the iframe directly
  useEffect(() => {
    const handleTimestampClick = (event) => {
      const { episodeId, timestamp } = event.detail;
      console.log('Timestamp clicked:', episodeId, timestamp);
      
      if (!episodeId) {
        console.error('No episode ID provided');
        return;
      }
      
      // Update state
      setCurrentEpisodeId(episodeId);
      setCurrentTimestamp(timestamp);
      setIsLoading(true);
      
      // Show loading state briefly before changing the iframe
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };
    
    window.addEventListener('spotify-timestamp-click', handleTimestampClick);
    
    return () => {
      window.removeEventListener('spotify-timestamp-click', handleTimestampClick);
    };
  }, []);

  // Don't render anything if not visible
  if (!isVisible) return null;
  
  // Direct Spotify embed URL with timestamp
  const spotifyEmbedUrl = currentEpisodeId ? 
    `https://open.spotify.com/embed/episode/${currentEpisodeId}?utm_source=generator&t=${currentTimestamp-1}` : 
    null;

  return (
    <div className="fixed bottom-10 left-10 right-0 h-30 bg-transparent shadow-lg z-50 opacity-90 w-[40vw]">
      <div className="container mx-auto px-4 py-2 flex items-center justify-start">
        <div className="flex items-center">
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-rose-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">Loading episode...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <span className="text-sm font-medium">Now Playing</span>
            </div>
          )}
        </div>
        
        <button 
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
          onClick={onClose}
          aria-label="Close player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Spotify iframe */}
      {spotifyEmbedUrl && (
        <iframe 
          ref={iframeRef}
          style={{ borderRadius: '12px' }}
          src={spotifyEmbedUrl}
          width="100%" 
          height="fit-content" 
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy"
        ></iframe>
      )}
    </div>
  );
};

export default SpotifyPlayer;