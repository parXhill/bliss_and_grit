'use client';

import { useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Nunito } from "next/font/google";


// Custom hooks
import useEpisodesData from './hooks/useEpisodesData';
import useSearch from './hooks/useSearch';
import useTranscript from './hooks/useTranscript';

// Utility functions
import { 
  formatTime, 
  formatDate, 
  formatTextWithLineBreaks, 
  highlightSearchTerms, 
  getSpotifyUrl,
  dispatchTimestampEvent
} from './utils/formatters';
import { 
  getEpisodeImagePlaceholder, 
  getSpeakerColor, 
  getSpeakerAvatarColor,
  groupResultsByEpisode
} from './utils/styleUtils';

// Components - Import the new components
import SpotifyAuth from '../../components/SpotifyAuth';
import SpotifySDKPlayer from '../../components/SpotifySDKPlayer';


const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});


export default function PodcastExplorer() {
  // View state management
  const [view, setView] = useState('episodes'); // 'episodes', 'search', 'transcript'
  const [playerVisible, setPlayerVisible] = useState(false);

  // Custom hooks
  const { episodes, speakers, loading: dataLoading, getSpotifyId } = useEpisodesData();
  
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
<div className={`min-h-screen bg-gray-50 text-gray-800 ${nunito.className}  flex flex-col ${nunito.variable}`}>
{/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 backdrop-blur-sm bg-[#773C40]">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* Back button (shows only when viewing transcript or search results) */}
            {(view === 'transcript' || view === 'search') && (
              <button 
                onClick={handleBack}
                className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <h1 className="text-xl font-medium text-white">
              {view === 'episodes' ? 'Bliss and Grit Podcast Explorer' : 
               view === 'transcript' ? `Episode ${selectedEpisode?.episodeNumber}: ${selectedEpisode?.title}` : 
               'Search Results'}
            </h1>
          </div>
          
          <div className="flex space-x-3">
            {/* Global search button */}
            <form 
              onSubmit={handleSearch}
              className="flex items-center bg-gray-50 border border-gray-200 rounded-full transition-all"
            >
              <input
                type="text"
                name="query"
                ref={searchInputRef}
                value={searchParams.query}
                onChange={handleSearchChange}
                placeholder="Search by keyword..."
                className="py-2 pl-4 pr-2 bg-transparent rounded-l-full w-40 sm:w-48 focus:w-56 focus:outline-none transition-all duration-300"
              />
              <button
                type="submit"
                className="p-2 rounded-full text-gray-500"
                aria-label="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            
            {/* Toggle filter button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="p-2 rounded-full bg-gray-50 border border-gray-200 relative text-gray-500"
              aria-label="Toggle filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              
              {/* Indicator dot for active filters */}
              {Object.values(searchParams).some(value => 
                value !== '' && value !== false && value !== true && value !== searchParams.query
              ) && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-500 rounded-full"></span>
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
              className="bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="container mx-auto px-4 sm:px-6 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                      Speaker
                    </label>
                    <select
                      name="speaker"
                      value={searchParams.speaker}
                      onChange={handleSearchChange}
                      className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 focus:outline-none transition-all"
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
                    <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                      Episode #
                    </label>
                    <input
                      type="number"
                      name="episodeNumber"
                      value={searchParams.episodeNumber}
                      onChange={handleSearchChange}
                      placeholder="e.g. 42"
                      className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                      Episode Title
                    </label>
                    <input
                      type="text"
                      name="episodeTitle"
                      value={searchParams.episodeTitle}
                      onChange={handleSearchChange}
                      placeholder="Keywords..."
                      className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                      Start Time
                    </label>
                    <input
                      type="text"
                      name="timeStart"
                      value={searchParams.timeStart}
                      onChange={handleSearchChange}
                      placeholder="HH:MM:SS"
                      className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                      End Time
                    </label>
                    <input
                      type="text"
                      name="timeEnd"
                      value={searchParams.timeEnd}
                      onChange={handleSearchChange}
                      placeholder="HH:MM:SS"
                      className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={resetSearch}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all text-gray-700"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="px-4 py-2.5 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all text-white"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center">
                  <label className="flex items-center text-sm text-gray-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="fullEpisode"
                      checked={searchParams.fullEpisode}
                      onChange={handleSearchChange}
                      className="h-4 w-4 rounded bg-white border-gray-300 text-indigo-500 focus:ring-indigo-200 mr-2"
                    />
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
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
              <svg className="animate-spin h-6 w-6 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium text-gray-800">Loading...</span>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4 sm:px-6 py-8">
          {/* Episodes View */}
          {view === 'episodes' && (
            <div>
              <h2 className="text-2xl font-medium text-gray-800 mb-8">Browse Episodes</h2>
              
              {/* Episode Cards */}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {episodes.map(episode => (
                  <motion.div
                    key={episode.id}
                    whileHover={{ y: -12, transition: { duration: 0.01 } }}
                    className="bg-white rounded-xl overflow-hidden cursor-pointer hover:transition-all hover:shadow-2xl shadow-lg border border-slate-400"
                    onClick={() => handleLoadTranscript(episode)}
                  >
                    <div className={`h-32 flex items-center justify-center bg-[#773C40]`}>
                      <span className="text-5xl font-bold text-white opacity-90">{episode.episodeNumber}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-medium italic text-lg mb-2 line-clamp-2 text-gray-800">
                        {episode.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500">
                        {formatDate(episode.publishDate)}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="inline-flex items-center text-sm font-medium text-black hover:text-rose-400 transition-colors">
                          View Transcript
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
              <div 
                ref={transcriptRef}
                className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto"
              >
                {transcript.length > 0 ? (
                  <div className="space-y-6">
                    {transcript.map((turn, index) => {
                      const prevSpeaker = index > 0 ? transcript[index - 1].speaker.id : null;
                      const isNewSpeaker = prevSpeaker !== turn.speaker.id;
                      const isHost = turn.speaker?.id === transcript[0].speaker?.id;
                      
                      return (
                        <div key={turn.id} className={`border p-2 border-slate-300 rounded-xl ${isNewSpeaker ? 'mt-8' : 'mt-4'}`}>
                          {isNewSpeaker && (
                            <div className="flex items-center mb-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isHost ? 'bg-rose-300' : 'bg-yellow-800'} text-white`}>
                                {(turn.speaker.displayName || turn.speaker.name).charAt(0)}
                              </div>
                              <div className="font-medium text-gray-800">
                                {turn.speaker.displayName || turn.speaker.name}
                              </div>
                              <button 
                                className="ml-2 text-xs text-slate-600 text-center py-1 px-2 rounded-2xl hover:font-bold flex items-center group cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const episodeId = selectedEpisode?.spotifyEpisodeId || getSpotifyId(selectedEpisode?.episodeNumber);
                                  dispatchTimestampEvent(episodeId, turn.startTime);
                                  setPlayerVisible(true);
                                }}
                              >
                                {formatTime(turn.startTime)}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 bg-green-300 border rounded-full ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <div className="pl-12">
                            <div className={`rounded-lg p-4 ${isHost ? 'bg-white' : 'bg-white'} ${isNewSpeaker ? 'rounded-tl-none' : ''}`}>
                              <p className="text-gray-700 text-sm leading-relaxed" style={{ lineHeight: 1.5 }}>
                                {formatTextWithLineBreaks(turn.content)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-gray-500">Loading transcript...</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Search Results View */}
          {view === 'search' && (
            <div>
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-4xl font-bold text-gray-800">
                    Search Results
                  </h2>
                  <div className="text-md font-bold bg-white text-[#773C40] px-3 py-1 rounded-full">
                    {searchResults.length} matches found
                  </div>
                </div>
                
                {searchResults.length > 0 ? (
                  <div className="space-y-8">
                    {groupResultsByEpisode(searchResults).map(group => (
                      <div 
                        key={`episode-${group.episodeNumber}`}
                        className="bg-white rounded-lg shadow-lg"
                      >
                        <div className="px-6 py-2 border-b border-indigo-100">
                          <div className="grid grid-cols-8">
                            <h3 onClick={() => handleLoadTranscript({
                                episodeNumber: group.episodeNumber,
                                title: group.title
                              })} className="text-lg cursor-pointer hover:underline font-medium text-gray-900 col-span-7">
                              Episode {group.episodeNumber}: {group.title}
                              
                            </h3>
                            <span className="text-xs bg-white px-3 py-1 rounded-full text-[#773C40]">
                              {group.items.length} match{group.items.length !== 1 ? 'es' : ''}
                            </span>
                          
                          {/* <div className="flex justify-end">
                            <button 
                              onClick={() => handleLoadTranscript({
                                episodeNumber: group.episodeNumber,
                                title: group.title
                              })}
                              className="text-xs flex items-center text-[#773C40] hover:text-indigo-700 transition-colors cursor-pointer"
                            >
                              <span>Episode</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </button>
                          </div> */}
                        </div>
                        </div>
                        <div className="px-6">
                          {group.items.map((item, index) => {
                            const prevSpeaker = index > 0 ? group.items[index - 1].speaker.id : null;
                            const isNewSpeaker = prevSpeaker !== item.speaker.id;
                            const isHost = item.speaker?.id === group.items[0].speaker?.id;
                            
                            return (
                              <div key={item.id} className={`${isNewSpeaker ? 'mt-1' : 'mt-1'} flex`}>
                                {isNewSpeaker && (
                                  <div className="flex items-center m-1">
                                    {/* <div className={`w-8 h-8 rounded-full  flex items-center justify-center mr-2 ${isHost ? 'bg-indigo-500' : 'bg-white'} text-white`}>
                                      {(item.speaker.displayName || item.speaker.name).charAt(0)}
                                    </div> */}
                                    <div className="font-medium text-nowrap text-gray-800 ">
                                      {item.speaker.displayName || item.speaker.name}
                                    </div>


                                      <span onClick={(e) => {
                                        e.stopPropagation();
                                        const episodeId = getSpotifyId(group.episodeNumber);
                                        dispatchTimestampEvent(episodeId, item.startTime);
                                        setPlayerVisible(true);
                                      }} className='text-xs ml-3 flex flex-row-reverse gap-x-1 items-center justify-between cursor-pointer hover:font-bold'>{formatTime(item.startTime)}
                                          <svg xmlns="http://www.w3.org/2000/svg" className="bg-green-300 h-4 w-4 border rounded-full ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                </span>
                                  
                                
                                <div className="pl-10 ">
                                  <div className={`rounded-lg   ${isHost ? 'bg-white' : 'bg-white'} ${isNewSpeaker ? 'rounded-tl-none' : ''}`}>
                                    <p className="text-gray-700 leading-relaxed" style={{ lineHeight: 1.3 }}>
                                      {highlightSearchTerms(item.content, searchParams.query)}
                                    </p>
                                  </div>
                                </div> 
                                
                                 </div>
                                )}


                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Results Found</h3>
                    <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search terms or filters to find what you are looking for.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 text-center text-gray-500">
          <p className="text-sm">© {new Date().getFullYear()} Bliss and Grit Podcast Explorer</p>
        </div>
      </footer>
      
      {/* Spotify Player - Replace with SDK player wrapped in Auth component */}
      <SpotifyAuth>
        {({ accessToken }) => (
          <SpotifySDKPlayer 
            isVisible={playerVisible}
            onClose={() => setPlayerVisible(false)}
            accessToken={accessToken}
          />
        )}
      </SpotifyAuth>
    </div>
  );
}