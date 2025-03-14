// scripts/identifySpeakers.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function identifySpeakersInEpisode(episodeId) {
  // Get the first several segments of the episode
  const initialSegments = await prisma.segment.findMany({
    where: { 
      episodeId: episodeId 
    },
    orderBy: { 
      startTime: 'asc' 
    },
    take: 100, // Check first 100 segments
    include: {
      speaker: true
    }
  });
  
  let vanessaSpeakerId = null;
  let brookeSpeakerId = null;
  
  // Search patterns that would identify speakers
  const vanessaPatterns = [
    /I'?m Vanessa/i,
    /I am Vanessa/i,
    /This is Vanessa/i,
  ];
  
  const brookePatterns = [
    /I'?m Brooke/i,
    /I am Brooke/i,
    /This is Brooke/i,
  ];
  
  // Check each segment for identification patterns
  for (const segment of initialSegments) {
    // Check for Vanessa patterns
    for (const pattern of vanessaPatterns) {
      if (pattern.test(segment.content) && !vanessaSpeakerId) {
        vanessaSpeakerId = segment.speakerId;
        console.log(`Identified Vanessa as ${vanessaSpeakerId} in episode ${episodeId}`);
        break;
      }
    }
    
    // Check for Brooke patterns
    for (const pattern of brookePatterns) {
      if (pattern.test(segment.content) && !brookeSpeakerId) {
        brookeSpeakerId = segment.speakerId;
        console.log(`Identified Brooke as ${brookeSpeakerId} in episode ${episodeId}`);
        break;
      }
    }
    
    // If we've identified both speakers, we can stop scanning
    if (vanessaSpeakerId && brookeSpeakerId) {
      break;
    }
  }
  
  // If we only identified one speaker, infer the other
  if (vanessaSpeakerId && !brookeSpeakerId) {
    // Find the other speaker ID used in the episode
    const otherSpeakers = await prisma.segment.findMany({
      where: {
        episodeId: episodeId,
        NOT: {
          speakerId: vanessaSpeakerId
        }
      },
      distinct: ['speakerId'],
      select: {
        speakerId: true
      }
    });
    
    if (otherSpeakers.length === 1) {
      brookeSpeakerId = otherSpeakers[0].speakerId;
      console.log(`Inferred Brooke as ${brookeSpeakerId} in episode ${episodeId}`);
    }
  } else if (brookeSpeakerId && !vanessaSpeakerId) {
    // Similar logic to infer Vanessa's ID
    const otherSpeakers = await prisma.segment.findMany({
      where: {
        episodeId: episodeId,
        NOT: {
          speakerId: brookeSpeakerId
        }
      },
      distinct: ['speakerId'],
      select: {
        speakerId: true
      }
    });
    
    if (otherSpeakers.length === 1) {
      vanessaSpeakerId = otherSpeakers[0].speakerId;
      console.log(`Inferred Vanessa as ${vanessaSpeakerId} in episode ${episodeId}`);
    }
  }
  
  return {
    vanessaSpeakerId,
    brookeSpeakerId,
    identified: !!(vanessaSpeakerId && brookeSpeakerId)
  };
}

async function normalizeSpeakers() {
  // Create canonical speaker records if they don't exist
  const vanessa = await prisma.speaker.upsert({
    where: { id: 'vanessa' },
    update: { displayName: 'Vanessa Scotto' },
    create: { id: 'vanessa', displayName: 'Vanessa Scotto' }
  });
  
  const brooke = await prisma.speaker.upsert({
    where: { id: 'brooke' },
    update: { displayName: 'Brooke Thomas' },
    create: { id: 'brooke', displayName: 'Brooke Thomas' }
  });
  
  const episodes = await prisma.episode.findMany();
  const manualCheckNeeded = [];
  
  for (const episode of episodes) {
    console.log(`\nProcessing episode ${episode.episodeNumber}: ${episode.title}...`);
    
    const { vanessaSpeakerId, brookeSpeakerId, identified } = await identifySpeakersInEpisode(episode.id);
    
    if (identified) {
      // Update segments
      await prisma.segment.updateMany({
        where: { episodeId: episode.id, speakerId: vanessaSpeakerId },
        data: { speakerId: 'vanessa' }
      });
      
      await prisma.segment.updateMany({
        where: { episodeId: episode.id, speakerId: brookeSpeakerId },
        data: { speakerId: 'brooke' }
      });
      
      // Update turns
      await prisma.turn.updateMany({
        where: { episodeId: episode.id, speakerId: vanessaSpeakerId },
        data: { speakerId: 'vanessa' }
      });
      
      await prisma.turn.updateMany({
        where: { episodeId: episode.id, speakerId: brookeSpeakerId },
        data: { speakerId: 'brooke' }
      });
      
      console.log(`Updated speaker assignments for episode ${episode.episodeNumber}`);
    } else {
      manualCheckNeeded.push({
        episodeNumber: episode.episodeNumber,
        title: episode.title
      });
      console.log(`⚠️ Could not identify speakers in episode ${episode.episodeNumber}, manual check needed`);
    }
  }
  
  console.log("\nSpeaker normalization complete!");
  
  if (manualCheckNeeded.length > 0) {
    console.log("\nThe following episodes need manual speaker verification:");
    manualCheckNeeded.forEach(ep => {
      console.log(`- Episode ${ep.episodeNumber}: ${ep.title}`);
    });
  }
}

normalizeSpeakers()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });