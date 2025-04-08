'use client'

import React, { useState } from 'react';
import SpotifySDKPlayer from '@/components/SpotifySDKPlayer'; 
import SpotifyAuth from '@/components/SpotifyAuth';
import useEpisodesData from '../../../../src/components/PodcastExplorer/hooks/useEpisodesData';
import { dispatchTimestampEvent} from '../../../../src/components/PodcastExplorer/utils/formatters';



// Main Quote Collection Component
export function QuoteCollection({ initialQuotes, speakers, episodes }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Function to handle flipping the speaker
  const handleSpeakerFlip = async (quoteId, currentSpeakerId) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    const newSpeakerId = currentSpeakerId === 'vanessa' ? 'brooke' : 'vanessa';
    
    try {
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
      
      const newSpeakerName = speakers.find(s => s.id === newSpeakerId)?.displayName || newSpeakerId;
      
      const element = document.querySelector(`[data-quote-id="${quoteId}"] .speaker-name`);
      if (element) {
        element.setAttribute('data-speaker-id', newSpeakerId);
        element.textContent = `— ${newSpeakerName} `;
      }
      
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
      <div 
        className="p-8 bg-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl border border-[#773C40]/20" 
        data-quote-id={quoteId}
      >
        <div className="flex justify-center mb-5">
          <div className="text-[#773C40] text-3xl">"</div>
        </div>
        
        <blockquote className="text-lg italic text-gray-800 mb-6 leading-relaxed text-center font-light">
          {quote}
        </blockquote>
        
        <div className="flex justify-center mb-5">
          <div className="text-[#773C40] text-3xl">"</div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-[#773C40]/10">
          <cite 
            className="font-medium text-gray-900 flex items-center group"
            onClick={(e) => {
              e.stopPropagation();
              handleSpeakerFlip(quoteId, speakerId);
            }}
            title="Click to change speaker"
          >
            <span className="speaker-name" data-speaker-id={speakerId}>— {speaker} </span>
            <span className="cursor-pointer text-[#773C40] ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">(Change)</span>
          </cite>
          
          <div className="flex items-center">
            {startTime && (
              <div className="flex items-center">
                <span className="text-sm text-[#773C40] italic mr-1">Listen</span>
                <button 
                  className="cursor-pointer transition-transform duration-300 hover:scale-110 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    const episodeId = getSpotifyId(episodeNumber);
                    dispatchTimestampEvent(episodeId, startTime);
                    setIsVisible(true);
                  }}
                  aria-label="Play this quote"
                >{<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 bg-green-300 border rounded-full ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>}</button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-[#773C40]/70 text-center">Episode {episodeNumber}: {episodeTitle} </p>
      </div>
    );
  };

  // Episode Section Component
  const EpisodeSection = ({ episodeNumber, quotes }) => {
    return (
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-10 text-[#773C40] border-b border-[#773C40]/30 pb-3 text-center">
          Episode {episodeNumber}
        </h2>
        <div className="space-y-16 flex flex-col items-center">
          {quotes.map((quote) => (
            <div className="w-full max-w-2xl" key={quote.id}>
              <QuoteCard 
                quoteId={quote.id}
                quote={quote.content} 
                speaker={quote.speaker.displayName || quote.speaker.name}
                speakerId={quote.speakerId}
                episodeNumber={episodeNumber}
                startTime={quote.segment?.startTime}
                episodeTitle={quote.episode.title}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Quote Filter Component
  const QuoteFilter = ({ onFilterChange, speakers, episodes }) => {
    const allowedSpeakers = speakers.filter(speaker => 
      speaker.id === 'vanessa' || speaker.id === 'brooke'
    );
    
    return (
      <div className="mb-14 p-6 bg-[#773C40]/10 rounded-xl shadow-md border border-[#773C40]/20">
        <h3 className="text-[#773C40] font-semibold mb-5 text-lg text-center">Search through the top quotes from each episode</h3>
        <div className="flex flex-col md:flex-row gap-5 max-w-2xl mx-auto">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-[#773C40] mb-2">
              Speaker
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 bg-white border border-[#773C40]/30 rounded-lg text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#773C40] focus:border-transparent transition-all duration-300"
                onChange={(e) => onFilterChange('speakerId', e.target.value)}
              >
                <option value="">All Speakers</option>
                {allowedSpeakers.map((speaker) => (
                  <option key={speaker.id} value={speaker.id}>{speaker.displayName || speaker.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-5 h-5 text-[#773C40]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-[#773C40] mb-2">
              Episode
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 bg-white border border-[#773C40]/30 rounded-lg text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#773C40] focus:border-transparent transition-all duration-300"
                onChange={(e) => onFilterChange('episodeId', e.target.value)}
              >
                <option value="">All Episodes</option>
                {episodes.map((episode) => (
                  <option key={episode.id} value={episode.id}>Episode {episode.episodeNumber}: {episode.title}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-5 h-5 text-[#773C40]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [filters, setFilters] = useState({
    speakerId: '',
    episodeId: '',
    search: ''
  });
  
  const hasActiveFilter = filters.speakerId !== '' || filters.episodeId !== '' || filters.search !== '';

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const filteredQuotes = initialQuotes.filter(quote => {
    const isAllowedSpeaker = quote.speakerId === 'vanessa' || quote.speakerId === 'brooke';
    
    if (!isAllowedSpeaker) return false;
    
    const matchesSpeaker = !filters.speakerId || quote.speakerId === filters.speakerId;
    const matchesEpisode = !filters.episodeId || quote.episodeId === filters.episodeId;
    const matchesSearch = !filters.search || 
      quote.content.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSpeaker && matchesEpisode && matchesSearch;
  });
  
  let episodesArray = [];
  
  if (hasActiveFilter) {
    const quotesGroupedByEpisode = {};
    filteredQuotes.forEach(quote => {
      const episodeNumber = quote.episode.episodeNumber;
      if (!quotesGroupedByEpisode[episodeNumber]) {
        quotesGroupedByEpisode[episodeNumber] = [];
      }
      quotesGroupedByEpisode[episodeNumber].push(quote);
    });
    
    episodesArray = Object.entries(quotesGroupedByEpisode)
      .map(([episodeNumber, quotes]) => ({
        episodeNumber,
        quotes
      }))
      .sort((a, b) => Number(a.episodeNumber) - Number(b.episodeNumber));
  }

  return (
    <div className="min-h-screen bg-[#773C40]/5 px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3 text-[#773C40]">
          Bliss and Grit
        </h1>
        <p className="text-xl text-gray-700">Quote Collection</p>
        <div className="w-24 h-1 bg-[#773C40] mx-auto mt-6"></div>
      </div>
      
      <div className="container mx-auto max-w-4xl">
        <QuoteFilter 
          onFilterChange={handleFilterChange}
          speakers={speakers}
          episodes={episodes}
        />
      
      {!hasActiveFilter ? (
        <div className="text-center p-14 bg-white rounded-xl shadow-md border border-[#773C40]/20 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-[#773C40]/20 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#773C40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h10M7 16h10" />
            </svg>
          </div>
          <p className="text-gray-700 max-w-md mx-auto leading-relaxed">
            Select a speaker or episode above to discover quotes from the Bliss and Grit podcast that might resonate with your journey.
          </p>
        </div>
      ) : episodesArray.length > 0 ? (
        <div className="space-y-20">
          {episodesArray.map((episode) => (
            <EpisodeSection 
              key={episode.episodeNumber}
              episodeNumber={episode.episodeNumber}
              quotes={episode.quotes}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-14 bg-white rounded-xl shadow-md border border-[#773C40]/20 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-[#773C40]/20 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#773C40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-[#773C40] mb-4">No Matching Wisdom</h3>
          <p className="text-gray-700 max-w-md mx-auto leading-relaxed">
            We couldn't find quotes matching your selected filters. Try different options to discover more insights.
          </p>
        </div>
      )}

      <SpotifyAuth>
        {({ accessToken }) => (
          <>
            <div id="spotify-auth" data-token={accessToken} style={{ display: 'none' }} />
            
            <SpotifySDKPlayer 
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
              accessToken={accessToken}
            />
          </>
        )}
      </SpotifyAuth>
      
      <div className="mt-16 py-10 text-center border-t border-[#773C40]/20">
      </div>
    </div>
  </div>
  );
}