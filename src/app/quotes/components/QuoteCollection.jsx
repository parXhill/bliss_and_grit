'use client'

import React, { useState } from 'react';

// Quote Card Component
const QuoteCard = ({ quote, speaker, episodeNumber, startTime }) => {
  return (
    <div className="p-6 m-4 bg-white rounded-lg shadow-md">
      <blockquote className="text-lg italic text-gray-700 mb-4">
        "{quote}"
      </blockquote>
      <div className="flex justify-between items-center">
        <cite className="font-medium text-gray-900">— {speaker}</cite>
        <div className="text-sm text-gray-500">
          <span>Episode {episodeNumber}</span>
          {startTime && (
            <span className="ml-2">@ {startTime}</span>
          )}
        </div>
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
        {quotes.map((quote) => (
          <QuoteCard 
            key={quote.id}
            quote={quote.content} 
            speaker={quote.speaker.displayName || quote.speaker.name}
            episodeNumber={episodeNumber}
            startTime={quote.segment?.startTime}
          />
        ))}
      </div>
    </div>
  );
};

// Quote Filter Component
const QuoteFilter = ({ onFilterChange, speakers, episodes }) => {
  // Filter speakers to only show 'vanessa' and 'brooke'
  const allowedSpeakers = speakers.filter(speaker => 
    speaker.id === 'vanessa' || speaker.id === 'brooke'
  );
  
  return (
    <div className="mb-6 p-4 bg-gray-100 rounded-lg">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Speaker
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md"
            onChange={(e) => onFilterChange('speakerId', e.target.value)}
          >
            <option value="">All Speakers</option>
            {allowedSpeakers.map((speaker) => (
              <option key={speaker.id} value={speaker.id}>{speaker.displayName || speaker.name}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Episode
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md"
            onChange={(e) => onFilterChange('episodeId', e.target.value)}
          >
            <option value="">All Episodes</option>
            {episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>Episode {episode.episodeNumber}</option>
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
export function QuoteCollection({ initialQuotes, speakers, episodes }) {
  const [filters, setFilters] = useState({
    speakerId: '',
    episodeId: '',
    search: ''
  });
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  // Apply filters client-side
  const filteredQuotes = initialQuotes.filter(quote => {
    // Only include quotes from 'vanessa' or 'brooke'
    const isAllowedSpeaker = quote.speakerId === 'vanessa' || quote.speakerId === 'brooke';
    
    // Skip quotes from other speakers
    if (!isAllowedSpeaker) return false;
    
    // Apply other filters
    const matchesSpeaker = !filters.speakerId || quote.speakerId === filters.speakerId;
    const matchesEpisode = !filters.episodeId || quote.episodeId === filters.episodeId;
    const matchesSearch = !filters.search || 
      quote.content.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSpeaker && matchesEpisode && matchesSearch;
  });
  
  // Group quotes by episode number
  const quotesGroupedByEpisode = {};
  filteredQuotes.forEach(quote => {
    const episodeNumber = quote.episode.episodeNumber;
    if (!quotesGroupedByEpisode[episodeNumber]) {
      quotesGroupedByEpisode[episodeNumber] = [];
    }
    quotesGroupedByEpisode[episodeNumber].push(quote);
  });
  
  // Convert to array format for rendering and sort by episode number
  const episodesArray = Object.entries(quotesGroupedByEpisode)
    .map(([episodeNumber, quotes]) => ({
      episodeNumber,
      quotes
    }))
    .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
        Spiritual Wisdom Quotes Collection
      </h1>
      
      <QuoteFilter 
        onFilterChange={handleFilterChange}
        speakers={speakers}
        episodes={episodes}
      />
      
      {episodesArray.length > 0 ? (
        episodesArray.map((episode) => (
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
}