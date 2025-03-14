// app/search/page.jsx
'use client';

import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchTranscripts = async () => {
    if (!query) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Podcast Transcript Search</h1>
      
      <div className="flex mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcripts..."
          className="flex-grow p-2 border rounded-l"
        />
        <button
          onClick={searchTranscripts}
          disabled={loading}
          className="bg-blue-500 text-white p-2 rounded-r"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((segment) => (
            <div key={segment.id} className="border p-4 rounded">
              <div className="flex justify-between mb-2">
                <span className="font-bold">
                  Episode {segment.episode.episodeNumber}: {segment.episode.title}
                </span>
                <span>{segment.startTime}</span>
              </div>
              <div className="italic mb-2">
                {segment.speaker.displayName}:
              </div>
              <p>{segment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>{loading ? 'Searching...' : 'No results to display'}</p>
      )}
    </div>
  );
}