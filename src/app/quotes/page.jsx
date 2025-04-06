'use client' 

import React, { useState } from 'react';
import { quoteArray } from '../../../data/quoteArray.js'; // Assuming quoteArray is imported from a separate file


// Quote Card Component
const QuoteCard = ({ quote, speaker, episodeNumber }) => {
  return (
    <div className="p-6 m-4 bg-white rounded-lg shadow-md">
      <blockquote className="text-lg italic text-gray-700 mb-4">
        "{quote}"
      </blockquote>
      <div className="flex justify-between items-center">
        <cite className="font-medium text-gray-900">— {speaker}</cite>
        {episodeNumber && (
          <span className="text-sm text-gray-500">Episode {episodeNumber}</span>
        )}
      </div>
    </div>
  );
};

// Episode Section Component
const EpisodeSection = ({ episodeNumber, quotes }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Episode {episodeNumber}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotes.map((quote, index) => (
          <QuoteCard 
            key={index} 
            quote={quote.quote} 
            speaker={quote.speaker} 
          />
        ))}
      </div>
    </div>
  );
};

// Quote Filter Component
const QuoteFilter = ({ onFilterChange, speakers }) => {
  return (
    <div className="mb-6 p-4 bg-gray-100 rounded-lg">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Speaker
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md"
            onChange={(e) => onFilterChange('speaker', e.target.value)}
          >
            <option value="">All Speakers</option>
            {speakers.map((speaker, idx) => (
              <option key={idx} value={speaker}>{speaker}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Episode
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md"
            onChange={(e) => onFilterChange('episode', e.target.value)}
          >
            <option value="">All Episodes</option>
            {Array.from(new Set(quoteArray.map(ep => ep.episodeNumber))).map((ep, idx) => (
              <option key={idx} value={ep}>Episode {ep}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Quotes
          </label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Search quote content..."
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

// Main Quote Collection Component
const QuoteCollection = () => {
  const [filters, setFilters] = useState({
    speaker: '',
    episode: '',
    search: ''
  });
  
  // Get unique speakers
  const allSpeakers = Array.from(
    new Set(
      quoteArray.flatMap(ep => 
        ep.quotes.map(q => q.speaker)
      )
    )
  );

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  // Apply filters
  const filteredData = quoteArray
    .map(episode => {
      // Filter quotes in each episode
      const filteredQuotes = episode.quotes.filter(quote => {
        const matchesSpeaker = !filters.speaker || quote.speaker === filters.speaker;
        const matchesSearch = !filters.search || 
          quote.quote.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSpeaker && matchesSearch;
      });
      
      return {
        ...episode,
        quotes: filteredQuotes
      };
    })
    .filter(episode => {
      // Filter episodes
      const matchesEpisode = !filters.episode || episode.episodeNumber === filters.episode;
      return matchesEpisode && episode.quotes.length > 0;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
        Spiritual Wisdom Quotes Collection
      </h1>
      
      <QuoteFilter 
        onFilterChange={handleFilterChange}
        speakers={allSpeakers}
      />
      
      {filteredData.length > 0 ? (
        filteredData.map((episode) => (
          <EpisodeSection 
            key={episode.episodeNumber}
            episodeNumber={episode.episodeNumber}
            quotes={episode.quotes}
          />
        ))
      ) : (
        <div className="text-center p-8 text-gray-500">
          No quotes match your current filters
        </div>
      )}
    </div>
  );
};

export default QuoteCollection;