'use client'

import React, { useState } from 'react';
import SpotifySDKPlayer from '@/components/SpotifySDKPlayer'; 
import SpotifyAuth from '@/components/SpotifyAuth';
import useEpisodesData from '../../../../src/components/PodcastExplorer/hooks/useEpisodesData';
import { dispatchTimestampEvent} from '../../../../src/components/PodcastExplorer/utils/formatters';


// Main Quote Collection Component
export function QuoteCollection({ initialQuotes, speakers, episodes }) {
  
  // Removing quotes state to prevent re-renders
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // State to track when update is in progress

  // Function to handle flipping the speaker
  const handleSpeakerFlip = async (quoteId, currentSpeakerId) => {
    // Prevent multiple clicks while updating
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    // Determine the new speaker ID - flip between 'vanessa' and 'brooke'
    const newSpeakerId = currentSpeakerId === 'vanessa' ? 'brooke' : 'vanessa';
    
    try {
      // Use the existing updateSpeaker route
      const response = await fetch('/api/transcript/updateSpeaker', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: quoteId,
          newSpeakerId,
          recordType: 'quote'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update speaker');
      }
      
      // Instead of updating state, update the DOM directly to avoid re-renders
      // Find the new speaker name
      const newSpeakerName = speakers.find(s => s.id === newSpeakerId)?.displayName || newSpeakerId;
      
      // Find the element and update it directly
      const element = document.querySelector(`[data-quote-id="${quoteId}"] .speaker-name`);
      if (element) {
        element.setAttribute('data-speaker-id', newSpeakerId);
        element.textContent = `— ${newSpeakerName} `;
      }
      
      // Subtle feedback
      console.log(`Speaker updated from ${currentSpeakerId} to ${newSpeakerId}`);
      
    } catch (error) {
      console.error('Error updating speaker:', error);
      alert('Failed to update speaker. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

// Quote Card Component
const QuoteCard = ({ quote, speaker, episodeNumber, startTime, quoteId, speakerId, episodeTitle }) => {
  const { getSpotifyId } = useEpisodesData();

  return (
    <div className="p-6 m-4 bg-white rounded-lg shadow-md" data-quote-id={quoteId}>
      <blockquote className="text-lg italic text-gray-700 mb-4">
        "{quote}"
      </blockquote>
      <div className="flex justify-between items-center">
        <cite 
          className="font-medium text-gray-900 flex items-center"
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            handleSpeakerFlip(quoteId, speakerId);
          }}
          title="Click to change speaker"
        >
          <span className="speaker-name" data-speaker-id={speakerId}>— {speaker} </span>
          <span className="cursor-pointer hover:text-blue-600 hover:underline ml-1 text-xs text-blue-500">(Change)</span>
        </cite>
        
        <div className="text-sm text-gray-500 flex items-center">
          <span className="italic"> Play</span>
          {startTime && (
            <span 
              className="ml-2 cursor-pointer hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                const episodeId = getSpotifyId(episodeNumber);
                dispatchTimestampEvent(episodeId, startTime);
                setIsVisible(true);
              }}
            >{<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 bg-green-300 border rounded-full ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}</span>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs italic">Episode {episodeNumber}: {episodeTitle} </p>
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
            quoteId={quote.id}
            quote={quote.content} 
            speaker={quote.speaker.displayName || quote.speaker.name}
            speakerId={quote.speakerId}
            episodeNumber={episodeNumber}
            startTime={quote.segment?.startTime}
            episodeTitle={quote.episode.title}
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
            <option value="">Select a Speaker</option>
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
            <option value="">Select an Episode</option>
            {episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>Episode {episode.episodeNumber}: {episode.title}</option>
            ))}
          </select>
        </div>
        
        {/* <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Quotes
          </label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter search term..."
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </div> */}
      </div>
    </div>
  );
};


  const [filters, setFilters] = useState({
    speakerId: '',
    episodeId: '',
    search: ''
  });
  
  // Track if any filter has been applied
  const hasActiveFilter = filters.speakerId !== '' || filters.episodeId !== '' || filters.search !== '';

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Apply filters client-side - use initialQuotes directly
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
  
  // Only process quotes if at least one filter is active
  let episodesArray = [];
  
  if (hasActiveFilter) {
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
    episodesArray = Object.entries(quotesGroupedByEpisode)
      .map(([episodeNumber, quotes]) => ({
        episodeNumber,
        quotes
      }))
      .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
        Bliss and Grit Quotes
      </h1>
      
      <QuoteFilter 
        onFilterChange={handleFilterChange}
        speakers={speakers}
        episodes={episodes}
      />
      
      {!hasActiveFilter ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xl font-medium text-gray-700 mb-2">Welcome to the Quotes Collection</h3>
          <p className="text-gray-600">
            Please select a speaker, episode, or enter a search term to view quotes.
          </p>
        </div>
      ) : episodesArray.length > 0 ? (
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

      <SpotifyAuth>
        {({ accessToken }) => (
          <>
            {/* Hidden element to store the token for preloading */}
            <div id="spotify-auth" data-token={accessToken} style={{ display: 'none' }} />
            
            <SpotifySDKPlayer 
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
              accessToken={accessToken}
            />
          </>
        )}
      </SpotifyAuth>
    </div>
  );
}