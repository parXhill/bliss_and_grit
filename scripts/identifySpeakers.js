const { Pool } = require('pg');
require('dotenv').config();

// Parse the database URL to show important parts
function parseDbUrl(url) {
  const mask = str => str ? '***' : '';
  try {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      return {
        user: match[1],
        password: mask(match[2]),
        host: match[3],
        port: match[4],
        database: match[5],
        ssl: url.includes('sslmode=require') ? 'required' : 'not specified'
      };
    }
    return { error: 'Unable to parse URL' };
  } catch (err) {
    return { error: err.message };
  }
}

// Display connection info without sensitive data
console.log("Database connection info:", parseDbUrl(process.env.DATABASE_URL));

// Create a PostgreSQL connection pool with explicit SSL options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'  // Try adding this explicit option
  }
});

// Test the connection before proceeding
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    process.exit(1);
  }
  console.log('Successfully connected to the database');
  release();
});

// Sleep utility function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to execute SQL with error handling
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

async function identifySpeakersInEpisode(episodeId) {
  console.log(`Identifying speakers in episode ${episodeId}...`);
  
  // Get the first several segments of the episode
  const segmentsQuery = `
    SELECT s.id, s."speakerId", s.content, s."startTime" 
    FROM "Segment" s
    WHERE s."episodeId" = $1
    ORDER BY s."startTime" ASC
    LIMIT 100
  `;
  
  const initialSegments = await executeQuery(segmentsQuery, [episodeId]);
  
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
    /it's brooke here/i
  ];
  
  // Check each segment for identification patterns
  for (const segment of initialSegments.rows) {
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
    const otherSpeakersQuery = `
      SELECT DISTINCT "speakerId"
      FROM "Segment"
      WHERE "episodeId" = $1 AND "speakerId" != $2
    `;
    
    const otherSpeakers = await executeQuery(otherSpeakersQuery, [episodeId, vanessaSpeakerId]);
    
    if (otherSpeakers.rows.length === 1) {
      brookeSpeakerId = otherSpeakers.rows[0].speakerId;
      console.log(`Inferred Brooke as ${brookeSpeakerId} in episode ${episodeId}`);
    }
  } else if (brookeSpeakerId && !vanessaSpeakerId) {
    // Similar logic to infer Vanessa's ID
    const otherSpeakersQuery = `
      SELECT DISTINCT "speakerId"
      FROM "Segment"
      WHERE "episodeId" = $1 AND "speakerId" != $2
    `;
    
    const otherSpeakers = await executeQuery(otherSpeakersQuery, [episodeId, brookeSpeakerId]);
    
    if (otherSpeakers.rows.length === 1) {
      vanessaSpeakerId = otherSpeakers.rows[0].speakerId;
      console.log(`Inferred Vanessa as ${vanessaSpeakerId} in episode ${episodeId}`);
    }
  }
  
  return {
    vanessaSpeakerId,
    brookeSpeakerId,
    identified: !!(vanessaSpeakerId && brookeSpeakerId)
  };
}

async function updateEpisodeSpeakers(episode, vanessaSpeakerId, brookeSpeakerId) {
  console.log(`Updating speakers for episode ${episode.episodeNumber}...`);
  
  // Update segments for Vanessa
  const updateVanessaSegmentsQuery = `
    UPDATE "Segment"
    SET "speakerId" = 'vanessa'
    WHERE "episodeId" = $1 AND "speakerId" = $2
  `;
  
  const vanessaSegmentResult = await executeQuery(updateVanessaSegmentsQuery, [episode.id, vanessaSpeakerId]);
  console.log(`Updated ${vanessaSegmentResult.rowCount} segments for Vanessa`);
  
  // Update segments for Brooke
  const updateBrookeSegmentsQuery = `
    UPDATE "Segment"
    SET "speakerId" = 'brooke'
    WHERE "episodeId" = $1 AND "speakerId" = $2
  `;
  
  const brookeSegmentResult = await executeQuery(updateBrookeSegmentsQuery, [episode.id, brookeSpeakerId]);
  console.log(`Updated ${brookeSegmentResult.rowCount} segments for Brooke`);
  
  // Update turns for Vanessa
  const updateVanessaTurnsQuery = `
    UPDATE "Turn"
    SET "speakerId" = 'vanessa'
    WHERE "episodeId" = $1 AND "speakerId" = $2
  `;
  
  const vanessaTurnResult = await executeQuery(updateVanessaTurnsQuery, [episode.id, vanessaSpeakerId]);
  console.log(`Updated ${vanessaTurnResult.rowCount} turns for Vanessa`);
  
  // Update turns for Brooke
  const updateBrookeTurnsQuery = `
    UPDATE "Turn"
    SET "speakerId" = 'brooke'
    WHERE "episodeId" = $1 AND "speakerId" = $2
  `;
  
  const brookeTurnResult = await executeQuery(updateBrookeTurnsQuery, [episode.id, brookeSpeakerId]);
  console.log(`Updated ${brookeTurnResult.rowCount} turns for Brooke`);
  
  console.log(`Completed speaker updates for episode ${episode.episodeNumber}`);
}

async function processEpisode(episode) {
  console.log(`\nProcessing episode ${episode.episodeNumber}: ${episode.title}...`);
  
  // Check if this episode needs processing
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM "Segment"
    WHERE "episodeId" = $1 AND "speakerId" NOT IN ('vanessa', 'brooke')
  `;
  
  const checkResult = await executeQuery(checkQuery, [episode.id]);
  const needsProcessing = parseInt(checkResult.rows[0].count) > 0;
  
  if (!needsProcessing) {
    console.log(`Episode ${episode.episodeNumber} already has canonical speaker IDs. Skipping.`);
    return { skipped: true };
  }
  
  try {
    // Identify speakers in this episode
    const { vanessaSpeakerId, brookeSpeakerId, identified } = await identifySpeakersInEpisode(episode.id);
    
    if (!identified) {
      console.log(`Could not identify speakers in episode ${episode.episodeNumber}`);
      return { 
        identified: false,
        episodeNumber: episode.episodeNumber,
        title: episode.title
      };
    }
    
    // Update speakers
    await updateEpisodeSpeakers(episode, vanessaSpeakerId, brookeSpeakerId);
    
    return { identified: true, updated: true };
  } catch (error) {
    console.error(`Error processing episode ${episode.episodeNumber}:`, error);
    return { 
      error: true,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      message: error.message
    };
  }
}

async function normalizeSpeakers() {
  try {
    console.log("Fetching all episodes...");
    const episodesQuery = `
      SELECT id, "episodeNumber", title
      FROM "Episode"
      ORDER BY "episodeNumber" ASC
    `;
    
    const episodesResult = await executeQuery(episodesQuery);
    const episodes = episodesResult.rows;
    
    console.log(`Found ${episodes.length} episodes`);
    
    const manualCheckNeeded = [];
    const processed = [];
    const skipped = [];
    const errors = [];
    
    for (const episode of episodes) {
      const result = await processEpisode(episode);
      
      if (result.skipped) {
        skipped.push(episode.episodeNumber);
      } else if (result.error) {
        errors.push({
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          message: result.message
        });
      } else if (!result.identified) {
        manualCheckNeeded.push({
          episodeNumber: episode.episodeNumber,
          title: episode.title
        });
      } else {
        processed.push(episode.episodeNumber);
      }
      
      // Add a delay between processing episodes
      await sleep(500);
    }
    
    console.log("\nSpeaker normalization complete!");
    console.log(`Processed: ${processed.length} episodes`);
    console.log(`Skipped: ${skipped.length} episodes`);
    console.log(`Errors: ${errors.length} episodes`);
    
    if (manualCheckNeeded.length > 0) {
      console.log("\nThe following episodes need manual speaker verification:");
      manualCheckNeeded.forEach(ep => {
        console.log(`- Episode ${ep.episodeNumber}: ${ep.title}`);
      });
    }
    
    if (errors.length > 0) {
      console.log("\nThe following episodes had errors:");
      errors.forEach(ep => {
        console.log(`- Episode ${ep.episodeNumber}: ${ep.title} - ${ep.message}`);
      });
    }
  } catch (error) {
    console.error("Error in normalizeSpeakers:", error);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    // Explicit test connection before starting
    console.log("Testing database connection...");
    const testQuery = "SELECT 1 as test";
    const testResult = await executeQuery(testQuery);
    console.log("Database connection test successful:", testResult.rows[0].test);
    
    await normalizeSpeakers();
  } catch (e) {
    console.error("Fatal error:", e);
  } finally {
    // Close the pool
    await pool.end();
    console.log("Database connections closed.");
  }
})();

// Install with: npm install pg


