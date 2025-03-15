'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useState({
    query: '',
    speaker: '',
    timeStart: '',
    timeEnd: '',
    episodeNumber: '',
    episodeTitle: '',
    fullEpisode: false
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  
  // Fetch speakers and episodes for dropdown selection
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [speakersRes, episodesRes] = await Promise.all([
          fetch('/api/speakers'),
          fetch('/api/episodes')
        ]);
        
        if (speakersRes.ok && episodesRes.ok) {
          const speakersData = await speakersRes.json();
          const episodesData = await episodesRes.json();
          
          setSpeakers(speakersData.data || []);
          setEpisodes(episodesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching reference data:', error);
      }
    };
    
    fetchReferenceData();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const searchTranscripts = async (e) => {
    e?.preventDefault();
    
    // Validate if at least one search parameter is provided
    const hasSearchParams = Object.values(searchParams).some(value => 
      value !== '' && value !== false
    );
    
    if (!hasSearchParams) return;
    
    // Build query string from all non-empty params
    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== '' && value !== false) {
        queryParams.append(key, value);
      }
    });
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Error searching transcripts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (timeString) => {
    // Convert time format for display (assuming format like "00:01:23.456")
    const parts = timeString.split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return `${hours}:${minutes}:${parseFloat(seconds).toFixed(0)}`;
    }
    return timeString;
  };
  
  // Function to highlight search terms in text
  const highlightSearchTerms = (text) => {
    if (!searchParams.query || searchParams.query.trim() === '') {
      return text;
    }
    
    const terms = searchParams.query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0);
    
    if (terms.length === 0) return text;
    
    // Replace matched terms with highlighted spans
    let highlightedText = text;
    terms.forEach(term => {
      const regex = new RegExp(`(\\b${term}\\b)`, 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<span class="bg-yellow-200 px-0.5 rounded">$1</span>`);
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };
  
  const groupResultsByEpisode = () => {
    const grouped = {};
    
    results.forEach(item => {
      const episodeKey = `${item.episode.episodeNumber}: ${item.episode.title}`;
      if (!grouped[episodeKey]) {
        grouped[episodeKey] = [];
      }
      grouped[episodeKey].push(item);
    });
    
    return grouped;
  };
  
  // Check if the results are turns or segments
  const isResultsTurns = results.length > 0 && 'turnId' in results[0] === false;
  const groupedResults = groupResultsByEpisode();
  
  // Get a color for a speaker (consistent per episode)
  const getSpeakerColor = (speakerId, episodeItems) => {
    // Find if this is the host/first speaker or guest
    const isHost = episodeItems[0].speaker.id === speakerId;
    return isHost ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter',system-ui,sans-serif]">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-4xl font-semibold text-gray-900 mb-6 text-center tracking-tight">
          Podcast Transcript Search
        </h1>
        
        <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-100 transition-all duration-300">
          <button 
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-blue-600 mb-4 flex items-center text-sm font-medium transition-colors duration-200 hover:text-blue-800 focus:outline-none"
          >
            <span className="mr-2">{advancedMode ? '◯ Simple Search' : '◯ Advanced Search'}</span>
          </button>
          
          <form onSubmit={searchTranscripts} className="space-y-6">
            {/* Simple search input */}
            {!advancedMode && (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  name="query"
                  value={searchParams.query}
                  onChange={handleInputChange}
                  placeholder="Search for topics, quotes, or discussions..."
                  className="flex-grow p-4 text-base border border-gray-200 rounded-lg sm:rounded-l-lg sm:rounded-r-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 shadow-sm text-gray-800"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="sm:w-auto w-full bg-blue-600 text-white px-6 py-4 rounded-lg sm:rounded-r-lg sm:rounded-l-none hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching
                    </span>
                  ) : 'Search'}
                </button>
              </div>
            )}
            
            {/* Advanced search form */}
            {advancedMode && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 bg-white rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Keywords or phrases
                    </label>
                    <input
                      type="text"
                      name="query"
                      value={searchParams.query}
                      onChange={handleInputChange}
                      placeholder="Enter search terms..."
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Speaker
                    </label>
                    <select
                      name="speaker"
                      value={searchParams.speaker}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800 appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em' }}
                    >
                      <option value="">All Speakers</option>
                      {speakers.map(speaker => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.displayName || speaker.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Episode Number
                    </label>
                    <input
                      type="number"
                      name="episodeNumber"
                      value={searchParams.episodeNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. 42"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Episode Title Contains
                    </label>
                    <input
                      type="text"
                      name="episodeTitle"
                      value={searchParams.episodeTitle}
                      onChange={handleInputChange}
                      placeholder="Keywords from the title..."
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Starting From (HH:MM:SS)
                    </label>
                    <input
                      type="text"
                      name="timeStart"
                      value={searchParams.timeStart}
                      onChange={handleInputChange}
                      placeholder="e.g. 00:10:30"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2 font-medium">
                      Ending At (HH:MM:SS)
                    </label>
                    <input
                      type="text"
                      name="timeEnd"
                      value={searchParams.timeEnd}
                      onChange={handleInputChange}
                      placeholder="e.g. 00:15:45"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none transition-all duration-200 text-gray-800"
                    />
                  </div>
                </div>
                
                <div className="flex items-center mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    name="fullEpisode"
                    id="fullEpisode"
                    checked={searchParams.fullEpisode}
                    onChange={handleInputChange}
                    className="mr-3 h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="fullEpisode" className="text-blue-800 text-sm font-medium">
                    Show full conversation context
                  </label>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchParams({
                      query: '',
                      speaker: '',
                      timeStart: '',
                      timeEnd: '',
                      episodeNumber: '',
                      episodeTitle: '',
                      fullEpisode: false
                    })}
                    className="order-2 sm:order-1 px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium text-sm"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="order-1 sm:order-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching
                      </span>
                    ) : 'Search Episodes'}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
        
        {results.length > 0 ? (
          <div className="space-y-10">
            {Object.entries(groupedResults).map(([episodeTitle, items]) => (
              <motion.div 
                key={episodeTitle} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
              >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium tracking-tight">
                      Episode {episodeTitle}
                    </h2>
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                      {items.length} result{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {items.map((item, index) => {
                    // Determine if this is a new speaker in the sequence
                    const prevSpeaker = index > 0 ? items[index - 1].speaker.id : null;
                    const isNewSpeaker = prevSpeaker !== item.speaker.id;
                    const speakerColor = getSpeakerColor(item.speaker.id, items);
                    
                    return (
                      <div key={item.id} className={`${isNewSpeaker ? 'mt-8' : 'mt-3'}`}>
                        {isNewSpeaker && (
                          <div className="flex items-center mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 
                              ${item.speaker.id === items[0].speaker.id ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                              {(item.speaker.displayName || item.speaker.name).charAt(0)}
                            </div>
                            <div className="font-medium text-gray-800">
                              {item.speaker.displayName || item.speaker.name}
                            </div>
                            <div className="ml-3 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {formatTime(item.startTime)}
                            </div>
                          </div>
                        )}
                        <div className="pl-10">
                          <div className={`rounded-xl p-4 border ${speakerColor} ${isNewSpeaker ? 'rounded-tl-none' : ''}`}>
                            <p className="text-gray-800 leading-relaxed">
                              {highlightSearchTerms(item.content)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            {loading ? (
              <div className="flex justify-center items-center">
                <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-4 text-blue-600 text-lg font-medium">Searching podcast transcripts...</span>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-10 max-w-2xl mx-auto border border-gray-100">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-3">Search Podcast Conversations</h3>
                <p className="text-gray-600">Enter topics, quotes, or specific phrases to find relevant discussions from podcast episodes.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 py-6 border-t border-gray-200">
          <p className="text-sm">© {new Date().getFullYear()} Podcast Explorer</p>
        </footer>
      </div>
    </div>
  );
}