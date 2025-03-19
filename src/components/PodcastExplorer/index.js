'use client';

import { useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom hooks
import useEpisodesData from './hooks/useEpisodesData';
import useSearch from './hooks/useSearch';
import useTranscript from './hooks/useTranscript';

// Utility functions
import { formatTime, formatDate, formatTextWithLineBreaks, highlightSearchTerms } from './utils/formatters';
import { 
  getEpisodeImagePlaceholder, 
  getSpeakerColor, 
  getSpeakerAvatarColor,
  groupResultsByEpisode
} from './utils/styleUtils';

export default function PodcastExplorer() {
  // View state management
  const [view, setView] = useState('episodes'); // 'episodes', 'search', 'transcript'

  // Custom hooks
  const { episodes, speakers, loading: dataLoading } = useEpisodesData();
  
  const { 
    searchParams, 
    searchResults, 
    loading: searchLoading, 
    filtersExpanded,
    searchInputRef, 
    handleSearchChange, 
    resetSearch, 
    performSearch, 
    setFiltersExpanded,
    focusSearch
  } = useSearch();
  
  const { 
    selectedEpisode, 
    transcript, 
    loading: transcriptLoading, 
    transcriptRef, 
    loadTranscript 
  } = useTranscript();

  // Combined loading state
  const loading = dataLoading || searchLoading || transcriptLoading;

  // Perform search and update view
  const handleSearch = async (e) => {
    e?.preventDefault();
    const result = await performSearch(e);
    if (result?.success) {
      setView('search');
    }
  };

  // Load transcript and update view
  const handleLoadTranscript = async (episode) => {
    const result = await loadTranscript(episode);
    if (result?.success) {
      setView('transcript');
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (view === 'transcript' || view === 'search') {
      setView('episodes');
    }
  };

  return (
    <div className="min-h-screen bg-green-50 font-['Montserrat',system-ui,sans-serif] text-gray-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-green-200 text-green-800 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* Back button (shows only when viewing transcript or search results) */}
            {(view === 'transcript' || view === 'search') && (
              <button 
                onClick={handleBack}
                className="mr-4 p-3 rounded-full hover:bg-green-100 transition-colors"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <h1 className="text-xl font-semibold tracking-tight">
              {view === 'episodes' ? 'Podcast Explorer' : 
               view === 'transcript' ? `Episode ${selectedEpisode?.episodeNumber}: ${selectedEpisode?.title}` : 
               'Search Results'}
            </h1>
          </div>
          
          <div className="flex space-x-4">
            {/* Global search button */}
            <form 
              onSubmit={handleSearch}
              className="flex items-center bg-white border border-green-300 shadow-sm hover:shadow-md rounded-full transition-all"
            >
              <input
                type="text"
                name="query"
                ref={searchInputRef}
                value={searchParams.query}
                onChange={handleSearchChange}
                placeholder="Search podcasts..."
                className="py-3 pl-5 pr-2 bg-transparent rounded-l-full w-44 focus:w-64 focus:outline-none transition-all duration-300"
              />
              <button
                type="submit"
                className="p-3 rounded-full text-green-700"
                aria-label="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            
            {/* Toggle filter button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="p-3 rounded-full bg-white border border-green-300 shadow-sm hover:shadow-md transition-all relative text-green-700"
              aria-label="Toggle filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              
              {/* Indicator dot for active filters */}
              {Object.values(searchParams).some(value => 
                value !== '' && value !== false && value !== true && value !== searchParams.query
              ) && (
                <span className="absolute top-2 right-2 h-3 w-3 bg-amber-400 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
        
        {/* Advanced search filters dropdown */}
        <AnimatePresence>
          {filtersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-green-100 overflow-hidden shadow-inner border-t border-green-200"
            >
              <div className="container mx-auto px-6 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
                  <div>
                    <label className="block text-sm text-green-800 mb-2 font-medium">
                      Speaker
                    </label>
                    <select
                      name="speaker"
                      value={searchParams.speaker}
                      onChange={handleSearchChange}
                      className="w-full p-3 rounded-xl bg-white border border-green-300 text-green-800 focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-all shadow-sm"
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
                    <label className="block text-sm text-green-800 mb-2 font-medium">
                      Episode #
                    </label>
                    <input
                      type="number"
                      name="episodeNumber"
                      value={searchParams.episodeNumber}
                      onChange={handleSearchChange}
                      placeholder="e.g. 42"
                      className="w-full p-3 rounded-xl bg-white border border-green-300 text-green-800 placeholder-green-500 focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-green-800 mb-2 font-medium">
                      Episode Title
                    </label>
                    <input
                      type="text"
                      name="episodeTitle"
                      value={searchParams.episodeTitle}
                      onChange={handleSearchChange}
                      placeholder="Keywords..."
                      className="w-full p-3 rounded-xl bg-white border border-green-300 text-green-800 placeholder-green-500 focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-green-800 mb-2 font-medium">
                      Start Time
                    </label>
                    <input
                      type="text"
                      name="timeStart"
                      value={searchParams.timeStart}
                      onChange={handleSearchChange}
                      placeholder="HH:MM:SS"
                      className="w-full p-3 rounded-xl bg-white border border-green-300 text-green-800 placeholder-green-500 focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-green-800 mb-2 font-medium">
                      End Time
                    </label>
                    <input
                      type="text"
                      name="timeEnd"
                      value={searchParams.timeEnd}
                      onChange={handleSearchChange}
                      placeholder="HH:MM:SS"
                      className="w-full p-3 rounded-xl bg-white border border-green-300 text-green-800 placeholder-green-500 focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={resetSearch}
                        className="px-5 py-3 bg-white border border-green-300 rounded-xl hover:bg-green-50 transition-all text-green-800 shadow-sm"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="px-5 py-3 bg-green-400 rounded-xl hover:bg-green-500 transition-all text-white font-medium shadow-sm"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center bg-white p-3 rounded-xl shadow-sm inline-block ml-1">
                  <input
                    type="checkbox"
                    name="fullEpisode"
                    id="fullEpisode"
                    checked={searchParams.fullEpisode}
                    onChange={handleSearchChange}
                    className="h-4 w-4 rounded bg-white border-green-400 text-green-500 focus:ring-green-300"
                  />
                  <label htmlFor="fullEpisode" className="ml-2 text-sm text-green-800 font-medium">
                    Show full conversation context
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      <main className="flex-grow">
        {/* Loading indicator */}
        {loading && (
          <div className="fixed inset-0 bg-green-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl flex items-center space-x-5">
              <svg className="animate-spin h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg font-medium text-green-800">Loading...</span>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-6 py-8">
          {/* Episodes View */}
          {view === 'episodes' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-medium text-green-800 mb-8">Browse Episodes</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {episodes.map(episode => (
                  <motion.div
                    key={episode.id}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer border border-green-100 transition-all hover:shadow-lg"
                    onClick={() => handleLoadTranscript(episode)}
                  >
                    <div className={`h-36 p-8 bg-gradient-to-br ${getEpisodeImagePlaceholder(episode.episodeNumber)} flex items-center justify-center`}>
                      <span className="text-4xl font-bold text-white opacity-90">#{episode.episodeNumber}</span>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-lg mb-3 line-clamp-2 text-green-800">
                        {episode.title}
                      </h3>
                      <div className="flex items-center text-sm text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(episode.publishDate)}
                      </div>
                      <div className="mt-5 pt-4 border-t border-green-100 flex justify-between items-center">
                        <span className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 transition-colors">
                          View Transcript
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Transcript View */}
          {view === 'transcript' && selectedEpisode && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden border border-green-100">
              <div className="bg-green-300 text-green-800 p-8">
                <h2 className="text-2xl font-medium">
                  <span className="text-green-700 font-normal">Episode {selectedEpisode.episodeNumber}</span>
                  <br />
                  {selectedEpisode.title}
                </h2>
                <div className="mt-3 text-sm text-green-700 bg-white bg-opacity-50 inline-block px-3 py-1 rounded-full">
                  {formatDate(selectedEpisode.publishDate)}
                </div>
              </div>
              
              <div 
                ref={transcriptRef}
                className="p-8 max-h-[calc(100vh-250px)] overflow-y-auto"
              >
                {transcript.length > 0 ? (
                  <div className="space-y-8">
                    {transcript.map((turn, index) => {
                      const prevSpeaker = index > 0 ? transcript[index - 1].speaker.id : null;
                      const isNewSpeaker = prevSpeaker !== turn.speaker.id;
                      const speakerColor = getSpeakerColor(turn.speaker.id, transcript);
                      const avatarColor = getSpeakerAvatarColor(turn.speaker.id, transcript);
                      
                      return (
                        <div key={turn.id} className={`${isNewSpeaker ? 'mt-10' : 'mt-6'}`}>
                          {isNewSpeaker && (
                            <div className="flex items-center mb-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 shadow-md ${avatarColor}`}>
                                {(turn.speaker.displayName || turn.speaker.name).charAt(0)}
                              </div>
                              <div className="font-medium text-green-800 text-lg">
                                {turn.speaker.displayName || turn.speaker.name}
                              </div>
                              <div className="ml-3 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                                {formatTime(turn.startTime)}
                              </div>
                            </div>
                          )}
                          <div className="pl-14">
                            <div className={`rounded-2xl p-6 border-2 shadow-sm ${speakerColor} ${isNewSpeaker ? 'rounded-tl-none' : ''}`}>
                              <p className="text-gray-800 leading-relaxed tracking-wide" style={{ lineHeight: 1.8 }}>
                                {formatTextWithLineBreaks(turn.content)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-green-600">Loading transcript...</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Search Results View */}
          {view === 'search' && (
            <div>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-medium text-green-800">
                    Search Results
                  </h2>
                  <div className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-full">
                    {searchResults.length} matches found
                  </div>
                </div>
                
                {searchResults.length > 0 ? (
                  <div className="space-y-10">
                    {groupResultsByEpisode(searchResults).map(group => (
                      <div 
                        key={`episode-${group.episodeNumber}`}
                        className="bg-white rounded-3xl shadow-md overflow-hidden border border-green-100"
                      >
                        <div className="bg-gradient-to-r from-green-300 to-green-400 text-green-800 px-8 py-5">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xl font-medium tracking-tight">
                              Episode {group.episodeNumber}: {group.title}
                            </h3>
                            <span className="text-sm bg-white/40 px-4 py-1 rounded-full">
                              {group.items.length} match{group.items.length !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button 
                              onClick={() => handleLoadTranscript({
                                episodeNumber: group.episodeNumber,
                                title: group.title
                              })}
                              className="text-sm flex items-center bg-white/60 hover:bg-white/90 transition-colors px-4 py-2 rounded-full text-green-700 shadow-sm"
                            >
                              <span>View Full Episode</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="p-8 space-y-6">
                          {group.items.map((item, index) => {
                            const prevSpeaker = index > 0 ? group.items[index - 1].speaker.id : null;
                            const isNewSpeaker = prevSpeaker !== item.speaker.id;
                            const speakerColor = getSpeakerColor(item.speaker.id, group.items);
                            const avatarColor = getSpeakerAvatarColor(item.speaker.id, group.items);
                            
                            return (
                              <div key={item.id} className={`${isNewSpeaker ? 'mt-8' : 'mt-5'}`}>
                                {isNewSpeaker && (
                                  <div className="flex items-center mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shadow-md ${avatarColor}`}>
                                      {(item.speaker.displayName || item.speaker.name).charAt(0)}
                                    </div>
                                    <div className="font-medium text-green-800">
                                      {item.speaker.displayName || item.speaker.name}
                                    </div>
                                    <div className="ml-3 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                                      {formatTime(item.startTime)}
                                    </div>
                                  </div>
                                )}
                                <div className="pl-12">
                                  <div className={`rounded-2xl p-5 border-2 shadow-sm ${speakerColor} ${isNewSpeaker ? 'rounded-tl-none' : ''}`}>
                                    <p className="text-gray-800 leading-relaxed" style={{ lineHeight: 1.8 }}>
                                      {highlightSearchTerms(item.content, searchParams.query)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-md p-12 text-center border border-green-100">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-green-800 mb-3">No Results Found</h3>
                    <p className="text-green-700 max-w-md mx-auto">Try adjusting your search terms or filters to find what you're looking for.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-auto py-6 bg-green-100 border-t border-green-200">
        <div className="container mx-auto px-6 text-center text-green-700">
          <p className="text-sm">© {new Date().getFullYear()} Podcast Explorer</p>
        </div>
      </footer>
    </div>
  );
}
