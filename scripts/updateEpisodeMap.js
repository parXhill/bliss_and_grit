const fs = require('fs/promises');
const path = require('path');
const { episodeMap } = require('../src/components/PodcastExplorer/utils/episodeMap.js');

// Speaker identification patterns
const speakerPatterns = {
  brooke: [
    /I'?m Brooke/i,
    /I am Brooke/i,
    /This is Brooke/i,
    /it's brooke here/i
  ],
  vanessa: [
    /I'?m Vanessa/i,
    /I am Vanessa/i,
    /This is Vanessa/i
  ],
  // Add patterns for guests based on common introductions
  guest: [
    /I'?m ([a-zA-Z]+ [a-zA-Z]+)/i,
    /Please welcome ([a-zA-Z]+ [a-zA-Z]+)/i,
    /our guest today is ([a-zA-Z]+ [a-zA-Z]+)/i,
    /joining us is ([a-zA-Z]+ [a-zA-Z]+)/i
  ]
};

async function identifySpeakersInFile(filePath, episodeInfo) {
  console.log(`Analyzing ${filePath} for episode ${episodeInfo.episodeNumber}`);
  
  try {
    // Read the transcript file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Split into lines or segments
    const lines = content.split('\n');
    
    // Keep track of speaker mappings
    const speakerMappings = {};
    const foundGuests = new Set();
    
    // Check each line for speaker patterns
    for (const line of lines) {
      // Extract speaker identifier (e.g., SPEAKER_00)
      const speakerMatch = line.match(/^(SPEAKER_\d+):/);
      if (!speakerMatch) continue;
      
      const speakerId = speakerMatch[1];
      const lineContent = line.substring(speakerId.length + 1).trim();
      
      // Skip if we've already identified this speaker
      if (speakerMappings[speakerId]) continue;
      
      // Check for Brooke
      if (speakerPatterns.brooke.some(pattern => pattern.test(lineContent))) {
        speakerMappings[speakerId] = "brooke";
        continue;
      }
      
      // Check for Vanessa
      if (speakerPatterns.vanessa.some(pattern => pattern.test(lineContent))) {
        speakerMappings[speakerId] = "vanessa";
        continue;
      }
      
      // Check for guest mentions
      for (const pattern of speakerPatterns.guest) {
        const match = lineContent.match(pattern);
        if (match) {
          const guestName = match[1];
          foundGuests.add(guestName);
          // Don't assign mapping yet, we'll do this after we know all guests
        }
      }
    }
    
    // Process any found guests
    if (foundGuests.size > 0) {
      console.log(`Found potential guests: ${Array.from(foundGuests).join(', ')}`);
      
      // For simplicity, we'll use the episode title to match guests
      const episodeTitle = episodeInfo.episodeName;
      
      // Get list of remaining unidentified speakers
      const remainingSpeakers = Object.keys(speakerMappings).length;
      
      // If we have guest info in the episode title, use that to map
      // This is a simplified approach - you might need more sophisticated guest matching
      if (episodeTitle.includes('Conversation with') || episodeTitle.includes('with ')) {
        console.log(`Episode title suggests a guest episode: ${episodeTitle}`);
        
        // Extract remaining speaker IDs that haven't been mapped
        const unmappedSpeakers = new Set();
        for (const line of lines) {
          const speakerMatch = line.match(/^(SPEAKER_\d+):/);
          if (speakerMatch && !speakerMappings[speakerMatch[1]]) {
            unmappedSpeakers.add(speakerMatch[1]);
          }
        }
        
        console.log(`Unmapped speakers: ${Array.from(unmappedSpeakers).join(', ')}`);
        
        // If there's exactly one unmapped speaker, assume it's the guest
        if (unmappedSpeakers.size === 1) {
          const guestSpeakerId = Array.from(unmappedSpeakers)[0];
          
          // Convert the guest name to camelCase for the speaker ID
          const guestMatch = episodeTitle.match(/Conversation with ([a-zA-Z]+ [a-zA-Z]+)/i) || 
                            episodeTitle.match(/with ([a-zA-Z]+ [a-zA-Z]+)/i);
          
          if (guestMatch) {
            const guestName = guestMatch[1];
            const guestId = guestName.replace(/\s+/g, '').toLowerCase();
            speakerMappings[guestSpeakerId] = guestId;
            console.log(`Mapped ${guestSpeakerId} to ${guestId} (${guestName})`);
          }
        }
      }
    }
    
    return {
      mappedSpeakers: speakerMappings,
      speakerCount: new Set(Object.values(speakerMappings)).size,
      success: Object.keys(speakerMappings).length > 0
    };
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

async function updateEpisodeMap() {
  const transcriptsDir = path.resolve(__dirname, './data/transcripts');
  const updatedEpisodeMap = {...episodeMap};
  
  for (const [episodeNum, episode] of Object.entries(updatedEpisodeMap)) {
    if (!episode.fileName) {
      console.log(`Episode ${episodeNum} has no fileName, skipping`);
      continue;
    }
    
    const filePath = path.join(transcriptsDir, episode.fileName);
    
    try {
      const result = await identifySpeakersInFile(filePath, episode);
      
      if (result.success) {
        // Create a new speakers object with the correct mappings
        const speakersObj = {};
        
        Object.entries(result.mappedSpeakers).forEach(([speakerId, canonicalId]) => {
          // Convert SPEAKER_XX to speakerN format
          const speakerNum = parseInt(speakerId.replace('SPEAKER_', '')) + 1;
          speakersObj[`speaker${speakerNum}`] = canonicalId;
        });
        
        // Update the episode's speakers property
        updatedEpisodeMap[episodeNum].speakers = speakersObj;
        console.log(`Updated episode ${episodeNum} speakers:`, speakersObj);
      } else {
        console.log(`Could not identify speakers for episode ${episodeNum}`);
      }
    } catch (error) {
      console.error(`Error processing episode ${episodeNum}:`, error);
    }
  }
  
  // Write the updated episode map to a file
  const outputPath = path.join(__dirname, 'updatedEpisodeMap.js');
  const outputContent = `const episodeMap = ${JSON.stringify(updatedEpisodeMap, null, 2)};\n\nmodule.exports = { episodeMap };`;
  
  await fs.writeFile(outputPath, outputContent, 'utf8');
  console.log(`Updated episode map written to ${outputPath}`);
  
  return updatedEpisodeMap;
}

// Run the script
updateEpisodeMap().catch(err => console.error('Fatal error:', err))