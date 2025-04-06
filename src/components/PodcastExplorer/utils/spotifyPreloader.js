// utils/spotifyPreloader.js

/**
 * Preloads Spotify episodes from search results
 * @param {Array} searchResults - The search results array 
 * @param {Function} getSpotifyId - Function to get Spotify ID from episode number
 * @param {string} accessToken - Spotify access token
 */
export const preloadSearchResultEpisodes = (searchResults, getSpotifyId, accessToken) => {
    if (!searchResults || !searchResults.length || !accessToken) {
      console.log('Preload skipped: Missing search results or token');
      return;
    }
    
    console.log('Starting preload with search results:', searchResults.slice(0, 2));
    
    // Extract unique episode numbers from the nested 'episode.episodeNumber' structure
    const episodeNumbers = new Set();
    
    searchResults.forEach(item => {
      // Check for the nested episode structure that we found in your data
      if (item.episode && item.episode.episodeNumber) {
        episodeNumbers.add(item.episode.episodeNumber);
      }
    });
    
    console.log('Found episode numbers:', Array.from(episodeNumbers));
    
    // Convert to Spotify IDs
    const spotifyIds = Array.from(episodeNumbers)
      .map(number => {
        const id = getSpotifyId(number);
        if (id) {
          console.log(`Episode number ${number} -> Spotify ID: ${id}`);
        } else {
          console.log(`Failed to get Spotify ID for episode ${number}`);
        }
        return id;
      })
      .filter(Boolean);
    
    if (spotifyIds.length === 0) {
      console.log('No valid Spotify IDs found to preload.');
      console.log('getSpotifyId function exists:', typeof getSpotifyId === 'function');
      
      // Test the getSpotifyId function with a sample episode number
      if (typeof getSpotifyId === 'function' && episodeNumbers.size > 0) {
        const testEpisode = Array.from(episodeNumbers)[0];
        console.log(`Testing getSpotifyId with episode ${testEpisode}:`, getSpotifyId(testEpisode));
      }
      
      return;
    }
    
    console.log(`Preloading ${spotifyIds.length} episodes:`, spotifyIds);
    
    // Process episodes in smaller batches
    const batchSize = 5;
    
    for (let i = 0; i < spotifyIds.length; i += batchSize) {
      const batch = spotifyIds.slice(i, i + batchSize);
      const idsParam = batch.join(',');
      
      // Make API call to prefetch episode metadata
      fetch(`https://api.spotify.com/v1/episodes?ids=${idsParam}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      .then(response => {
        console.log(`Preload batch ${i/batchSize + 1}: ${response.status} ${response.ok ? 'OK' : 'Failed'}`);
        return response.text();
      })
      .then(text => {
        try {
          // Try to parse as JSON just for logging
          const data = JSON.parse(text);
          console.log(`Preloaded ${data.episodes?.length || 0} episodes successfully`);
        } catch (e) {
          // Not valid JSON, just log the response text if it's short
          if (text.length < 100) {
            console.log('Preload response:', text);
          }
        }
      })
      .catch(error => {
        console.error('Error preloading episodes:', error);
      });
    }
  };