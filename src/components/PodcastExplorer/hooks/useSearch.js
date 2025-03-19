import { useState, useRef } from 'react';

/**
 * Custom hook to manage search functionality
 * @returns {Object} Search state and functions
 */
const useSearch = () => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    speaker: '',
    timeStart: '',
    timeEnd: '',
    episodeNumber: '',
    episodeTitle: '',
    fullEpisode: true
  });
  
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Refs
  const searchInputRef = useRef(null);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Reset search filters
  const resetSearch = () => {
    setSearchParams({
      query: '',
      speaker: '',
      timeStart: '',
      timeEnd: '',
      episodeNumber: '',
      episodeTitle: '',
      fullEpisode: true
    });
    
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Perform search
  const performSearch = async (e) => {
    e?.preventDefault();
    
    // Validate if at least one search parameter is provided
    const hasSearchParams = Object.values(searchParams).some(value => 
      value !== '' && value !== false
    );
    
    if (!hasSearchParams) return;
    
    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== '' && value !== false) {
        queryParams.append(key, value);
      }
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/search?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        return { success: true, data: data.data };
      } else {
        setError(data.error);
        console.error('Search failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      setError(error.message);
      console.error('Error searching transcripts:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle filters expanded state
  const toggleFilters = () => {
    setFiltersExpanded(!filtersExpanded);
  };
  
  // Focus search input
  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return {
    searchParams,
    searchResults,
    loading,
    error,
    filtersExpanded,
    searchInputRef,
    handleSearchChange,
    resetSearch,
    performSearch,
    toggleFilters,
    focusSearch,
    setFiltersExpanded
  };
};

export default useSearch;
