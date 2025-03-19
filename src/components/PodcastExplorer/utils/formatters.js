// Format time for display (HH:MM:SS)
export const formatTime = (timeString) => {
  const parts = timeString.split(':');
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return `${hours}:${minutes}:${parseFloat(seconds).toFixed(0)}`;
  }
  return timeString;
};

// Format date in a human-readable format
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format text with line breaks after periods
export const formatTextWithLineBreaks = (text) => {
  // Add line breaks after periods that are followed by a space and an uppercase letter or number
  const formattedText = text.replace(/\.\s+(?=[A-Z0-9])/g, '.\n\n');
  return formattedText.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < formattedText.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

// Format HTML text with line breaks after periods
export const formatTextWithLineBreaksHTML = (html) => {
  // Add line breaks after periods that are followed by a space and an uppercase letter or number
  return html.replace(/\.\s+(?=[A-Z0-9])/g, '.<br><br>');
};

// Highlight search terms in text
export const highlightSearchTerms = (text, searchQuery) => {
  if (!searchQuery || searchQuery.trim() === '') {
    return formatTextWithLineBreaks(text);
  }
  
  const terms = searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0);
  
  if (terms.length === 0) return formatTextWithLineBreaks(text);
  
  let highlightedText = text;
  terms.forEach(term => {
    const regex = new RegExp(`(\\b${term}\\b)`, 'gi');
    highlightedText = highlightedText.replace(regex, 
      `<span class="bg-yellow-200 px-0.5 rounded">$1</span>`);
  });
  
  // Apply line breaks after highlighting
  highlightedText = formatTextWithLineBreaksHTML(highlightedText);
  
  return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
};
