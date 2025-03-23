import { useState, useRef } from 'react';

/**
 * Custom hook to manage transcript loading and state
 * @returns {Object} Transcript state and functions
 */
const useTranscript = () => {
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateTranscriptSpeaker = (turnId, newSpeakerId, newSpeaker) => {
    setTranscript(prevTranscript => 
      prevTranscript.map(turn => 
        turn.id === turnId 
          ? { ...turn, speaker: newSpeaker || { id: newSpeakerId } }
          : turn
      )
    );
    
    return { success: true };
  };
  
  // Ref for transcript container
  const transcriptRef = useRef(null);
  
  // Load full episode transcript
  const loadTranscript = async (episode) => {
    setSelectedEpisode(episode);
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        episodeNumber: episode.episodeNumber,
        fullEpisode: true
      });
      
      const response = await fetch(`/api/search?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.data);
        
        // Scroll to top of transcript when loaded
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = 0;
        }
        
        return { success: true, data: data.data };
      } else {
        setError(data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      setError(error.message);
      console.error('Error loading transcript:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedEpisode,
    transcript,
    loading,
    error,
    transcriptRef,
    loadTranscript,
    updateTranscriptSpeaker
  };
};

export default useTranscript;
