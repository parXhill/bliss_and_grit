// scripts/loadTranscripts.js
const { PrismaClient } = require('@prisma/client');
const { parseTranscriptFile } = require('../src/app/utils/transcriptParser');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

// Import episodeMap with require
const { episodeMap } = require('../src/components/PodcastExplorer/utils/episodeMap');

// Global prisma instance for all operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

// Create a reverse lookup to find episode info by filename
// Modified to be more flexible with filename matching
const fileNameToEpisodeMap = {}; 
Object.values(episodeMap).forEach(episode => {
  if (episode.fileName) {
    // Store the original mapping
    fileNameToEpisodeMap[episode.fileName] = episode;
    
    // Also store a version without spaces (in case filesystem removed them)
    fileNameToEpisodeMap[episode.fileName.replace(/\s+/g, '')] = episode;
    
    // Add a normalized version (lowercase, no spaces)
    const normalizedName = episode.fileName.toLowerCase().replace(/\s+/g, '');
    fileNameToEpisodeMap[normalizedName] = episode;
  }
});

// Process multiple files concurrently with this limit
const CONCURRENCY_LIMIT = 3;

async function loadTranscript(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Processing transcript: ${fileName}`);
  
  // Find episode info from our map
  const episodeInfo = fileNameToEpisodeMap[fileName];
  
  if (!episodeInfo) {
    console.warn(`No episode info found for ${fileName}, skipping...`);
    return null;
  }
  
  // Check if episode already exists by episode number
  const existingEpisode = await prisma.episode.findFirst({
    where: {
      episodeNumber: episodeInfo.episodeNumber
    }
  });
  
  if (existingEpisode) {
    console.log(`Episode ${episodeInfo.episodeNumber} already exists, skipping...`);
    return null;
  }
  
  console.log(`Loading transcript: ${fileName}`);
  
  try {
    // Use transaction for consistency
    return await prisma.$transaction(async (tx) => {
      // 1. Create episode
      const episode = await tx.episode.create({
        data: {
          title: `Episode ${episodeInfo.episodeNumber}: ${episodeInfo.episodeName}`,
          fileName: fileName,
          episodeNumber: episodeInfo.episodeNumber,
        },
      });
      
      // 2. Parse the transcript file
      const { segments, turns } = await parseTranscriptFile(filePath, episode.id);
      
      // 3. Get all speaker IDs from this transcript
      const speakerIds = [...new Set([...segments.map(s => s.speakerId), ...turns.map(t => t.speakerId)])];
      console.log(`Speaker IDs in transcript: ${speakerIds.join(', ')}`);

      // Create speaker translation map for this episode
      const speakerTranslation = {};

      // For each speaker ID in the transcript
      for (const speakerId of speakerIds) {
        // Default to unknown
        let speakerName = "unknown";
        
        // Known speaker in episode map
        if (episodeInfo.speakers && episodeInfo.speakers[speakerId]) {
          speakerName = episodeInfo.speakers[speakerId];
        }
        // Fall back to defaults if necessary (for backward compatibility)
        else if (speakerId === 'SPEAKER_00') {
          speakerName = 'vanessa';
        }
        else if (speakerId === 'SPEAKER_01') {
          speakerName = 'brooke';
        }
        else if (speakerId !== "Unknown") {
          // For any other unmapped SPEAKER_XX, warn the user and use "unknown"
          console.warn(`Warning: Speaker "${speakerId}" in episode ${episodeInfo.episodeNumber} has no mapping. Using "unknown" instead.`);
          console.warn(`Consider adding this speaker to your episodeMap: ${speakerId}: "speakerName"`);
        }
        
        // Store the mapping from transcript ID to actual name
        speakerTranslation[speakerId] = speakerName;
      }

      console.log('Speaker translation for this episode:', speakerTranslation);

      // Get all unique speaker names we need for this episode
      const uniqueSpeakerNames = [...new Set(Object.values(speakerTranslation))];

      // Find all existing speakers with these names
      const existingSpeakers = await tx.speaker.findMany({
        where: {
          id: {
            in: uniqueSpeakerNames.map(name => name.toLowerCase())
          }
        }
      });

      console.log(`Found ${existingSpeakers.length} existing speakers out of ${uniqueSpeakerNames.length} needed`);

      // Create a map of speaker name to database ID
      const speakerNameToId = {};
      existingSpeakers.forEach(speaker => {
        speakerNameToId[speaker.id.toLowerCase()] = speaker.id;
      });

      // Create any missing speakers
      for (const speakerName of uniqueSpeakerNames) {
        if (!speakerNameToId[speakerName.toLowerCase()]) {
          console.log(`Creating new speaker: "${speakerName}"`);
          
          // Set the ID to be the lowercase name from episodeMap
          const speakerId = speakerName.toLowerCase();
          
          // Handle display names properly
          let displayName;
          if (speakerId === 'brooke') {
            displayName = 'Brooke Thomas';
          } else if (speakerId === 'vanessa') {
            displayName = 'Vanessa Scotto';
          } else if (speakerId === 'amodamaa') {
            displayName = 'Amoda Maa';
          } else if (speakerId === 'unknown') {
            displayName = 'Unknown Speaker';
          } else {
            // For any other speaker, capitalize nicely by words
            displayName = speakerName.split(/[\s_]+/).map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          }
          
          const newSpeaker = await tx.speaker.create({
            data: {
              id: speakerId,
              displayName: displayName,
              // The 'name' field is null so we don't need to set it
            }
          });
          
          speakerNameToId[speakerName.toLowerCase()] = newSpeaker.id;
        }
      }

      // Now create a final translation map from transcript speaker ID to database speaker ID
      const speakerIdTranslation = {};
      for (const [transcriptId, speakerName] of Object.entries(speakerTranslation)) {
        speakerIdTranslation[transcriptId] = speakerNameToId[speakerName.toLowerCase()];
      }

      console.log('Final speaker ID translation:', speakerIdTranslation);

      // Now use this translation map when creating turns and segments
      const turnsData = turns.map(turn => ({
        startTime: turn.startTime,
        endTime: turn.endTime,
        content: turn.content,
        episodeId: episode.id,
        speakerId: speakerIdTranslation[turn.speakerId], // Use the translated speaker ID
      }));
      
      // Use Prisma's createMany if available
      if (tx.turn.createMany) {
        await tx.turn.createMany({ data: turnsData });
      } else {
        // Process in batches of 50 for better efficiency
        const batchSize = 50;
        for (let i = 0; i < turnsData.length; i += batchSize) {
          const batch = turnsData.slice(i, i + batchSize);
          await Promise.all(batch.map(data => tx.turn.create({ data })));
        }
      }
      
      // Get the created turns to map them to segments
      const createdTurns = await tx.turn.findMany({
        where: { episodeId: episode.id },
        orderBy: { startTime: 'asc' }
      });
      
      // Create a lookup to efficiently match segments to turns
      const turnTimeRanges = turns.map((turn, index) => ({
        id: createdTurns[index].id,
        startTime: turn.startTime,
        endTime: turn.endTime,
        speakerId: speakerIdTranslation[turn.speakerId] // Use the translated speaker ID
      }));
      
      // Process segments
      const segmentsData = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const nextStartTime = segments[i + 1]?.startTime || null;
        
        // Find the matching turn for this segment
        const matchingTurn = turnTimeRanges.find(turn => 
          speakerIdTranslation[segment.speakerId] === turn.speakerId && // Compare using translated speaker ID
          segment.startTime >= turn.startTime && 
          (turn.endTime === null || segment.startTime <= turn.endTime)
        );
        
        if (matchingTurn) {
          segmentsData.push({
            startTime: segment.startTime,
            endTime: nextStartTime,
            content: segment.content,
            episodeId: episode.id,
            speakerId: speakerIdTranslation[segment.speakerId], // Use the translated speaker ID
            turnId: matchingTurn.id
          });
        }
      }
      
      // Insert segments in batches
      if (tx.segment.createMany) {
        await tx.segment.createMany({ data: segmentsData });
      } else {
        // Process in batches of 100 for better efficiency
        const batchSize = 100;
        for (let i = 0; i < segmentsData.length; i += batchSize) {
          const batch = segmentsData.slice(i, i + batchSize);
          await Promise.all(batch.map(data => tx.segment.create({ data })));
        }
      }
      
      console.log(`Successfully loaded episode ${episodeInfo.episodeNumber}: ${episodeInfo.episodeName}`);
      return episode;
    }, {
      timeout: 120000 // 2 minute timeout for the transaction
    });
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return null;
  }
}

async function loadAllTranscriptsFromDirectory() {
  const transcriptsDir = path.resolve(__dirname, '../data/transcripts');
  const files = await fs.readdir(transcriptsDir);
  
  console.log("Matching files to episodes based on episodeMap...");
  
  // Track matched and unmatched files
  const matchedFiles = [];
  const unmatchedFiles = [];
  
  for (const file of files) {
    if (!file.endsWith('.txt')) continue;
    
    // Check if this file is in our fileNameToEpisodeMap
    if (fileNameToEpisodeMap[file]) {
      matchedFiles.push(file);
    } else {
      // Try checking for normalized versions (in case of filesystem changes)
      const normalizedFileName = file.toLowerCase().replace(/\s+/g, '');
      if (fileNameToEpisodeMap[normalizedFileName]) {
        matchedFiles.push(file);
      } else {
        console.log(`No mapping found for "${file}"`);
        unmatchedFiles.push(file);
      }
    }
  }
  
  console.log(`Successfully matched ${matchedFiles.length} files to episodes.`);
  console.log(`Failed to match ${unmatchedFiles.length} files.`);
  
  // Process the matched files
  const validFiles = matchedFiles;
  
  console.log(`Found ${validFiles.length} valid transcript files to process.`);
  
  // Process files concurrently, but with a reasonable limit
  const results = [];
  
  // Process files in batches to avoid overwhelming the database
  for (let i = 0; i < validFiles.length; i += CONCURRENCY_LIMIT) {
    const batch = validFiles.slice(i, i + CONCURRENCY_LIMIT);
    console.log(`Processing batch ${Math.floor(i/CONCURRENCY_LIMIT) + 1}/${Math.ceil(validFiles.length/CONCURRENCY_LIMIT)}`);
    
    const batchPromises = batch.map(file => 
      loadTranscript(path.join(transcriptsDir, file))
    );
    
    // Wait for the current batch to complete before starting the next one
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));
  }
  
  // Report any unmapped files as a warning
  if (unmatchedFiles.length > 0) {
    console.warn(`Found ${unmatchedFiles.length} transcript file(s) with no mapping:`);
    unmatchedFiles.forEach(file => console.warn(`- ${file}`));
    
    console.warn('\nTo process these files, update your episodeMap with the correct file names.');
  }
  
  return results.length;
}

// Run the script
loadAllTranscriptsFromDirectory()
  .then(count => {
    console.log(`Successfully loaded ${count} episodes.`);
  })
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });