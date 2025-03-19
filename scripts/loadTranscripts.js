// scripts/loadTranscripts.js
const { PrismaClient } = require('@prisma/client');
const { parseTranscriptFile } = require('../src/app/utils/transcriptParser');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

// Either import episodeMap with require
const { episodeMap } = require('./episodeMap');
// OR use your embedded map (uncomment below if you had it embedded in the file)
// const episodeMap = { 
//   1: { episodeNumber: 1, episodeName: "Meet Vanessa", fileName: "" },
//   ...
// };

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
      
      // 3. Ensure speakers exist in database - do this in parallel
      const speakerIds = [...new Set([...segments.map(s => s.speakerId), ...turns.map(t => t.speakerId)])];
      await Promise.all(speakerIds.map(speakerId => {
        return tx.speaker.upsert({
          where: { id: speakerId },
          update: {},
          create: {
            id: speakerId,
            displayName: speakerId === 'SPEAKER_00' ? 'Vanessa Scotto' : 
                        speakerId === 'SPEAKER_01' ? 'Brooke Thomas' : speakerId
          },
        });
      }));
      
      // 4. Create turns in batch if supported, otherwise use Promise.all
      const turnsData = turns.map(turn => ({
        startTime: turn.startTime,
        endTime: turn.endTime,
        content: turn.content,
        episodeId: episode.id,
        speakerId: turn.speakerId,
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
      
      // Create a lookup map for turns by time and speaker
      const turnLookup = new Map();
      for (const turn of createdTurns) {
        turnLookup.set(`${turn.startTime}-${turn.speakerId}`, turn.id);
      }
      
      // 5. Create segments efficiently by using a direct relationship between turns and segments
      // Create a mapping of segments to turn IDs
      const segmentsData = [];
      
      // Create a lookup to efficiently match segments to turns
      const turnTimeRanges = turns.map((turn, index) => ({
        id: createdTurns[index].id,
        startTime: turn.startTime,
        endTime: turn.endTime,
        speakerId: turn.speakerId
      }));
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const nextStartTime = segments[i + 1]?.startTime || null;
        
        // Find the matching turn for this segment
        const matchingTurn = turnTimeRanges.find(turn => 
          segment.speakerId === turn.speakerId && 
          segment.startTime >= turn.startTime && 
          (turn.endTime === null || segment.startTime <= turn.endTime)
        );
        
        if (matchingTurn) {
          segmentsData.push({
            startTime: segment.startTime,
            endTime: nextStartTime,
            content: segment.content,
            episodeId: episode.id,
            speakerId: segment.speakerId,
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
  
  console.log("Matching files to episodes based on filename patterns...");
  
  // Track matched and unmatched files
  const matchedFiles = [];
  const unmatchedFiles = [];
  
  for (const file of files) {
    if (!file.endsWith('.txt')) continue;
    
    // Already in the mapping?
    if (fileNameToEpisodeMap[file]) {
      matchedFiles.push(file);
      continue;
    }
    
    // Extract episode number using multiple patterns
    let episodeNum = null;
    
    // Pattern 1: FINAL_BG_EPS101 or FINAL_BaG_EPS14
    const epsMatch = file.match(/EPS(\d+)/i);
    if (epsMatch) {
      episodeNum = parseInt(epsMatch[1], 10);
    }
    // Pattern 2: Ep_104
    else if (file.match(/^Ep_(\d+)/i)) {
      episodeNum = parseInt(file.match(/^Ep_(\d+)/i)[1], 10);
    }
    // Pattern 3: BG-106 or similar
    else if (file.match(/^BG-(\d+)/i)) {
      episodeNum = parseInt(file.match(/^BG-(\d+)/i)[1], 10);
    }
    // Pattern 4: Starts with number like 26_ or 48_
    else if (file.match(/^(\d+)_/)) {
      episodeNum = parseInt(file.match(/^(\d+)_/)[1], 10);
    }
    // Pattern 5: FinalBaG_126
    else if (file.match(/FinalBaG_(\d+)/i)) {
      episodeNum = parseInt(file.match(/FinalBaG_(\d+)/i)[1], 10);
    }
    
    // If we found a valid episode number and it exists in our map
    if (episodeNum && episodeMap[episodeNum]) {
      console.log(`Matched file "${file}" to Episode ${episodeNum}: ${episodeMap[episodeNum].episodeName}`);
      
      // Update the episode map with this filename
      episodeMap[episodeNum].fileName = file;
      fileNameToEpisodeMap[file] = episodeMap[episodeNum];
      matchedFiles.push(file);
    } else if (episodeNum) {
      console.log(`Found episode number ${episodeNum} in "${file}" but no matching entry in episodeMap`);
      unmatchedFiles.push(file);
    } else {
      console.log(`Could not extract episode number from "${file}"`);
      unmatchedFiles.push(file);
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
    
    // Suggest manual mapping for unmapped files
    console.warn('\nSuggested mappings to add to episodeMap:');
    console.warn('-----------------------------------');
    for (const file of unmatchedFiles) {
      // Try to extract a reasonable episode name from the filename
      let episodeName = file
        .replace(/FINAL_/i, '')
        .replace(/BaG_|BG_/i, '')
        .replace(/EPS\d+_/i, '')
        .replace(/transcript_with_speakers\.txt$/i, '')
        .replace(/_/g, ' ')
        .trim();
      
      console.warn(`// Add this to your episodeMap:`);
      console.warn(`// XX: { episodeNumber: XX, episodeName: "${episodeName}", fileName: "${file}" },`);
    }
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