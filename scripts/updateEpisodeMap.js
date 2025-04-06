const fs = require('fs');
const path = require('path');

function parseTranscript(filePath) {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines and take only the first 100
    const lines = content.split('\n').slice(0, 100);
    
    // Initialize result object
    const result = {
      fileName: path.basename(filePath),
      SPEAKER_00: '',
      SPEAKER_01: ''
    };
    
    // Search for the first instance of the word 'co-host'
    for (const line of lines) {
      if (line.includes('co-host')) {
        // Extract the speaker ID
        const speakerMatch = line.match(/\[\d+:\d+:\d+\]\s+(SPEAKER_\d+):/);
        if (!speakerMatch) continue;
        
        const speakerId = speakerMatch[1];
        
        // Extract the co-host name, considering a possible comma
        const coHostMatch = line.match(/co-host,?\s+(\w+)/);
        if (!coHostMatch) continue;
        
        const coHostName = coHostMatch[1];
        
        // Determine the other speaker ID
        const otherSpeakerId = speakerId === 'SPEAKER_00' ? 'SPEAKER_01' : 'SPEAKER_00';
        
        // Map the speakers based on the co-host name
        if (coHostName === 'Brooke') {
          // If co-host is Brooke, then this speaker is not Brooke (i.e., Vanessa)
          result[speakerId] = 'Vanessa';
          result[otherSpeakerId] = 'Brooke';
        } else if (coHostName === 'Vanessa') {
          // If co-host is Vanessa, then this speaker is not Vanessa (i.e., Brooke)
          result[speakerId] = 'Brooke';
          result[otherSpeakerId] = 'Vanessa';
        }
        
        break; // Exit after finding the first instance
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return null;
  }
}

// Process all transcript files in the directory
function processTranscripts() {
  const transcriptsDir = path.resolve(__dirname, '../data/transcripts');
  
  try {
    const files = fs.readdirSync(transcriptsDir);
    
    const results = [];
    
    for (const file of files) {
      if (file.endsWith('.txt')) {
        const filePath = path.join(transcriptsDir, file);
        const result = parseTranscript(filePath);
        if (result) {
          results.push(result);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error processing transcripts:', error);
    return [];
  }
}

// Execute the script
const mappings = processTranscripts();
console.log(JSON.stringify(mappings, null, 2));