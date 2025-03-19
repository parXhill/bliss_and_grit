import { useState, useEffect } from 'react';
import { episodeMap } from '../utils/episodeMap';

/**
 * Custom hook to fetch episodes and speakers data
 * @returns {Object} Episodes and speakers data and loading state
 */
const useEpisodesData = () => {
  const [episodes, setEpisodes] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  


  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [episodesRes, speakersRes] = await Promise.all([
          fetch('/api/episodes'),
          fetch('/api/speakers')
        ]);
        
        if (episodesRes.ok && speakersRes.ok) {
          const episodesData = await episodesRes.json();
          const speakersData = await speakersRes.json();
          
          // Enhance episodes with Spotify episode IDs if available
          const enhancedEpisodes = episodesData.data.map(episode => ({
            ...episode,
            spotifyEpisodeId: episodeMap[episode.episodeNumber]?.id || null
          }));
          
          setEpisodes(enhancedEpisodes || []);
          setSpeakers(speakersData.data || []);
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Function to get Spotify ID for an episode number
  const getSpotifyId = (episodeNumber) => {
    return episodeMap[episodeNumber]?.id || null;
  };

  return {
    episodes,
    speakers,
    loading,
    error,
    getSpotifyId
  };
};

export default useEpisodesData;