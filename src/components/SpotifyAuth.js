'use client';

import { useState, useEffect } from 'react';

const SpotifyAuth = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Check if we have a valid token in localStorage
        const storedToken = localStorage.getItem('spotify_token');
        const tokenExpiry = localStorage.getItem('spotify_token_expiry');
        
        if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
          setAccessToken(storedToken);
          setIsLoading(false);
          return;
        }
        
        // If no valid token, get a new one from our API endpoint
        const response = await fetch('/api/spotify-token');
        
        if (!response.ok) {
          throw new Error('Failed to fetch access token');
        }
        
        const data = await response.json();
        const newToken = data.access_token;
        
        // Store token with expiry
        localStorage.setItem('spotify_token', newToken);
        localStorage.setItem('spotify_token_expiry', Date.now() + ((data.expires_in - 60) * 1000));
        
        setAccessToken(newToken);
      } catch (err) {
        console.error('Authentication error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchToken();
    
    // Set up a refresh interval to ensure token stays valid
    const refreshInterval = setInterval(() => {
      const tokenExpiry = localStorage.getItem('spotify_token_expiry');
      // Refresh token if it expires in less than 5 minutes
      if (tokenExpiry && Date.now() > (parseInt(tokenExpiry) - (5 * 60 * 1000))) {
        fetchToken();
      }
    }, 4 * 60 * 1000); // Check every 4 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  if (isLoading) {
    return <div className="flex justify-center p-4">Loading Spotify...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error connecting to Spotify: {error}</p>
          <button 
            onClick={() => {
              localStorage.removeItem('spotify_token');
              localStorage.removeItem('spotify_token_expiry');
              window.location.reload();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Connection
          </button>
        </div>
      </div>
    );
  }
  
  if (!accessToken) {
    return (
      <div className="p-4 text-center">
        <p className="mb-4">Unable to authenticate with Spotify.</p>
      </div>
    );
  }
  
  // Pass the token down to children
  return (
    <>
      {/* Hidden element to expose token for preloading */}
      <div id="spotify-auth" data-token={accessToken} style={{ display: 'none' }} />
      
      {/* Keep your existing render prop */}
      {children({ accessToken })}
    </>
  );
};

export default SpotifyAuth;