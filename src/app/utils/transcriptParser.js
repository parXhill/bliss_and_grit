// utils/transcriptParser.js

const fs = require('fs/promises');

async function parseTranscriptFile(filePath, episodeId) {
  // 1. Read the file
  const content = await fs.readFile(filePath, 'utf-8');
  
  // 2. Initialize data structures
  const segments = [];
  const turns = [];
  let currentSpeaker = null;
  let lastKnownSpeaker = "SPEAKER_00"; // Default to first speaker if we start with Unknown
  let currentTurn = null;
  
  // 3. Process file line by line
  const lines = content.split('\n');
  for (const line of lines) {
    // Extract timestamp [H:MM:SS]
    const timestampMatch = line.match(/\[(\d+:\d+:\d+)\]/);
    if (!timestampMatch) continue;
    
    const timestamp = timestampMatch[1];
    
    // Extract speaker (SPEAKER_XX or Unknown)
    const speakerMatch = line.match(/(SPEAKER_\d+|Unknown):/);
    let speaker = speakerMatch ? speakerMatch[1] : 'Unknown';
    
    // Handle Unknown speaker attribution
    if (speaker === 'Unknown') {
      speaker = lastKnownSpeaker; // Attribute to the last known speaker
    } else {
      // Update the last known speaker when we encounter a specific one
      lastKnownSpeaker = speaker;
    }
    
    // Extract content (everything after the speaker label)
    const contentMatch = line.match(/(?:SPEAKER_\d+|Unknown): (.+)$/);
    const segmentContent = contentMatch ? contentMatch[1].trim() : '';
    
    if (!segmentContent) continue;
    
    // Create segment
    const segment = {
      startTime: timestamp,
      endTime: null, // We'll calculate this later
      content: segmentContent,
      speakerId: speaker,
      episodeId,
    };
    
    segments.push(segment);
    
    // Handle turns (group consecutive segments by same speaker)
    if (currentSpeaker !== speaker) {
      // New speaker, new turn
      if (currentTurn) {
        // Finalize previous turn
        currentTurn.endTime = segments[segments.length - 2]?.startTime || timestamp;
      }
      
      currentSpeaker = speaker;
      currentTurn = {
        startTime: timestamp,
        endTime: null,
        content: segmentContent,
        speakerId: speaker,
        episodeId,
        segments: [segment],
      };
      turns.push(currentTurn);
    } else {
      // Same speaker continues
      currentTurn.content += ' ' + segmentContent;
      currentTurn.segments.push(segment);
    }
  }
  
  // Finalize the last turn
  if (currentTurn) {
    currentTurn.endTime = segments[segments.length - 1]?.startTime || '';
  }
  
  return { segments, turns };
}

module.exports = { parseTranscriptFile };