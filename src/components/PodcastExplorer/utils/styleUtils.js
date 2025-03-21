// Generate random placeholder background for episodes
export const getEpisodeImagePlaceholder = (episodeNumber) => {
  const randomSeed = episodeNumber % 10;
  const colors = [
    'from-green-200 to-green-300',
    'from-green-300 to-green-400', 
    'from-green-200 to-green-300',
    'from-green-300 to-green-400',
    'from-green-400 to-green-500',
    'from-teal-200 to-green-300',
    'from-emerald-200 to-green-300',
    'from-teal-300 to-green-400',
    'from-emerald-300 to-green-400',
    'from-green-300 to-teal-400'
  ];
  return colors[randomSeed];
};

// Get speaker color for message bubbles
export const getSpeakerColor = (speakerId, items) => {
  const isHost = items && items.length > 0 && items[0].speaker?.id === speakerId;
  return isHost ? 'bg-green-50 border-green-300 text-green-800' : 'bg-indigo-50 border-amber-300 text-amber-800';
};

// Get speaker avatar color
export const getSpeakerAvatarColor = (speakerId, items) => {
  const isHost = items && items.length > 0 && items[0].speaker?.id === speakerId;
  return isHost ? 'bg-green-400 text-white' : 'bg-amber-400 text-white';
};

// Group search results by episode
export const groupResultsByEpisode = (searchResults) => {
  const grouped = {};
  
  searchResults.forEach(item => {
    const episodeKey = `${item.episode.episodeNumber}: ${item.episode.title}`;
    if (!grouped[episodeKey]) {
      grouped[episodeKey] = {
        episodeNumber: item.episode.episodeNumber,
        title: item.episode.title,
        items: []
      };
    }
    grouped[episodeKey].items.push(item);
  });
  
  return Object.values(grouped);
};
