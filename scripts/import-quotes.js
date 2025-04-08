const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

// Import quotes from data file
const { quoteArray: quotesData } = require('../data/quoteArray.js');

async function importQuotes() {
  console.log('Starting quote import...');
  let totalImported = 0;
  let skipped = 0;
  let failures = 0;
  
  for (const episodeData of quotesData) {
    const { episodeNumber, quotes } = episodeData;
    
    // Convert episodeNumber to integer if it's a string
    const episodeNumberInt = typeof episodeNumber === 'string' 
      ? parseInt(episodeNumber, 10) 
      : episodeNumber;
    
    // Find the episode by episodeNumber
    const episode = await prisma.episode.findFirst({
      where: { 
        episodeNumber: episodeNumberInt 
      }
    });
    
    if (!episode) {
      console.log(`Episode ${episodeNumberInt} not found, skipping...`);
      failures += quotes.length;
      continue;
    }
    
    console.log(`Processing quotes for Episode ${episodeNumberInt}...`);
    
    // Process each quote
    for (const quoteData of quotes) {
      try {
        // Find the speaker by displayName
        const speaker = await prisma.speaker.findFirst({
          where: { displayName: quoteData.speaker }
        });
        
        if (!speaker) {
          console.log(`Speaker "${quoteData.speaker}" not found for quote in Episode ${episodeNumberInt}`);
          failures++;
          continue;
        }
        
        // Check if this quote already exists
        const existingQuote = await prisma.quote.findFirst({
          where: {
            content: quoteData.quote,
            episodeId: episode.id,
            speakerId: speaker.id
          }
        });
        
        if (existingQuote) {
          console.log(`Quote from ${speaker.displayName} in Episode ${episodeNumberInt} already exists, skipping`);
          skipped++;
          continue;
        }
        
        // Create the quote (only if it doesn't exist)
        await prisma.quote.create({
          data: {
            content: quoteData.quote,
            episode: { connect: { id: episode.id } },
            speaker: { connect: { id: speaker.id } }
            // turnId will be null initially
          }
        });
        
        totalImported++;
      } catch (error) {
        console.error(`Error importing quote: ${error.message}`);
        failures++;
      }
    }
  }
  
  console.log(`Import complete: ${totalImported} quotes imported successfully`);
  console.log(`Skipped ${skipped} quotes (already exist)`);
  if (failures > 0) {
    console.log(`${failures} quotes failed to import`);
  }
}

// Run the import
importQuotes()
  .catch(e => {
    console.error(`Import failed: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });