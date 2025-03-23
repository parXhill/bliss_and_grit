// components/SpeakerSelector.jsx
import React, { useState, useRef, useEffect } from 'react';

const SpeakerSelector = ({ speakers, currentSpeaker, turnId, onSpeakerChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSpeakerChange = (newSpeakerId) => {
    if (newSpeakerId === currentSpeaker.id) {
      setIsOpen(false);
      return;
    }

    // Call the provided callback with the new parameter name id instead of turnId
    onSpeakerChange(turnId, newSpeakerId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div
        className="cursor-pointer font-medium text-gray-800 group"
        onMouseEnter={() => setIsOpen(true)}
      >
        {currentSpeaker.displayName || currentSpeaker.name}
        <span className="ml-1 opacity-0 group-hover:opacity-100 text-xs text-rose-400">
          (edit)
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 -ml-1 bg-white rounded-md shadow-lg py-1 w-44 border border-gray-200">
          <div className="px-3 py-1 text-xs text-gray-500 font-medium border-b border-gray-100">
            Select Correct Speaker
          </div>
          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-rose-50`}
              onClick={() => handleSpeakerChange(speaker.id)}
            >
              {speaker.displayName || speaker.name}
              {/* {speaker.id === currentSpeaker.id && (
                <span className="ml-2 text-xs text-rose-500">•</span>
              )} */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpeakerSelector;