// scripts/identifySpeakersSupabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client with service role key for full database access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sleep utility function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test Supabase connection
async function testConnection() {
  try {
    console.log("Testing Supabase connection...");
    
    // Get current timestamp from database
    const { data, error } = await supabase
      .rpc('get_current_timestamp');
    
    if (error) {
      // If the RPC function doesn't exist, try a direct query
      const { data: rawData, error: rawError } = await supabase
        .from('Episode')
        .select('count')
        .limit(1);
      
      if (rawError) {
        throw rawError;
      }
      
      console.log("Connection successful!");
      return true;
    }
    
    console.log(`Connection successful! Database time: ${data}`);
    return true;
  } catch (error) {
    console.error("Connection test failed:", error.message);
    console.log("You may need to create the get_current_timestamp function:");
    console.log(`
    CREATE OR REPLACE FUNCTION get_current_timestamp()
    RETURNS timestamptz
    LANGUAGE SQL
    AS $$
      SELECT now();
    $$;
    `);
    return false;
  }
}

// Helper function to execute SQL queries
async function executeQuery(query, params = []) {
  const { data, error } = await supabase.rpc('run_sql', { 
    query_text: query,
    params_array: params 
  });
  
  if (error) {
    // If the RPC function doesn't exist, explain how to create it
    console.error("Error executing query:", error.message);
    console.log("You'll need to create the run_sql RPC function:");
    console.log(`
    CREATE OR REPLACE FUNCTION run_sql(query_text text, params_array json)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query_text
      USING (SELECT * FROM json_array_elements_text(params_array))
      INTO result;
      RETURN result;
    END;
    $$;
    `);
    throw error;
  }
  
  return data;
}

// Fallback to direct table access if RPC is not available
async function getEpisodes() {
  try {
    // Try to get episodes using run_sql if it exists
    return await executeQuery(`
      SELECT id, "episodeNumber", title
      FROM "Episode"
      ORDER BY "episodeNumber" ASC
    `);
  } catch (error) {
    // Fall back to direct table access
    console.log("Falling back to direct table access for episodes...");
    const { data, error: fetchError } = await supabase
      .from('Episode')
      .select('id, episodeNumber, title')
      .order('episodeNumber', { ascending: true });
    
    if (fetchError) {
      throw fetchError;
    }
    
    return data;
  }
}

async function getEpisodeSegments(episodeId) {
  const { data, error } = await supabase
    .from('Segment')
    .select('id, speakerId, content, startTime')
    .eq('episodeId', episodeId)
    .order('startTime', { ascending: true })
    .limit(100);
  
  if (error) {
    throw error;
  }
  
  return data;
}

async function getOtherSpeakers(episodeId, speakerId) {
  const { data, error } = await supabase
    .from('Segment')
    .select('speakerId')
    .eq('episodeId', episodeId)
    .neq('speakerId', speakerId)
    .limit(1);
  
  if (error) {
    throw error;
  }
  
  return data;
}

async function updateSpeakers(episodeId, originalSpeakerId, newSpeakerId) {
  // Update segments
  const { data: segmentData, error: segmentError } = await supabase
    .from('Segment')
    .update({ speakerId: newSpeakerId })
    .eq('episodeId', episodeId)
    .eq('speakerId', originalSpeakerId);
  
  if (segmentError) {
    throw segmentError;
  }
  
  // Update turns
  const { data: turnData, error: turnError } = await supabase
    .from('Turn')
    .update({ speakerId: newSpeakerId })
    .eq('episodeId', episodeId)
    .eq('speakerId', originalSpeakerId);
  
  if (turnError) {
    throw turnError;
  }
  
  return { segmentData, turnData };
}

async function identifySpeakersInEpisode(episodeId) {
  console.log(`Identifying speakers in episode ${episodeId}...`);
  
  // Get the first several segments of the episode
  const initialSegments = await getEpisodeSegments(episodeId);
  
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
    const otherSpeakers = await getOtherSpeakers(episodeId, vanessaSpeakerId);
    
    if (otherSpeakers.length === 1) {
      brookeSpeakerId = otherSpeakers[0].speakerId;
      console.log(`Inferred Brooke as ${brookeSpeakerId} in episode ${episodeId}`);
    }
  } else if (brookeSpeakerId && !vanessaSpeakerId) {
    // Similar logic to infer Vanessa's ID
    const otherSpeakers = await getOtherSpeakers(episodeId, brookeSpeakerId);
    
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

async function updateEpisodeSpeakers(episode, vanessaSpeakerId, brookeSpeakerId) {
  console.log(`Updating speakers for episode ${episode.episodeNumber}...`);
  
  // Update speaker IDs
  try {
    // Update Vanessa segments and turns
    await updateSpeakers(episode.id, vanessaSpeakerId, 'vanessa');
    console.log(`Updated Vanessa's segments and turns from ${vanessaSpeakerId} to 'vanessa'`);
    
    // Update Brooke segments and turns
    await updateSpeakers(episode.id, brookeSpeakerId, 'brooke');
    console.log(`Updated Brooke's segments and turns from ${brookeSpeakerId} to 'brooke'`);
    
    console.log(`Completed speaker updates for episode ${episode.episodeNumber}`);
    return true;
  } catch (error) {
    console.error(`Error updating speakers: ${error.message}`);
    return false;
  }
}

async function processEpisode(episode) {
  console.log(`\nProcessing episode ${episode.episodeNumber}: ${episode.title}...`);
  
  // Check if this episode needs processing
  const { data: segments, error } = await supabase
    .from('Segment')
    .select('speakerId')
    .eq('episodeId', episode.id)
    .not('speakerId', 'in', '("vanessa","brooke")')
    .limit(1);
  
  if (error) {
    console.error(`Error checking segments: ${error.message}`);
    return { error: true, message: error.message };
  }
  
  // If no non-canonical segments found, skip this episode
  if (segments.length === 0) {
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
    const updated = await updateEpisodeSpeakers(episode, vanessaSpeakerId, brookeSpeakerId);
    
    return { 
      identified: true, 
      updated: updated,
      episodeNumber: episode.episodeNumber
    };
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
    // Get all episodes
    const episodes = await getEpisodes();
    console.log(`Found ${episodes.length} episodes`);
    
    const manualCheckNeeded = [];
    const processed = [];
    const skipped = [];
    const errors = [];
    
    // Process episodes in batches to avoid memory issues
    const BATCH_SIZE = 5;
    for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
      console.log(`\nProcessing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(episodes.length/BATCH_SIZE)}...`);
      
      const batch = episodes.slice(i, i + BATCH_SIZE);
      for (const episode of batch) {
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
    const connected = await testConnection();
    
    if (connected) {
      console.log("\nStarting speaker normalization...");
      await normalizeSpeakers();
      console.log("\nProcess completed successfully!");
    } else {
      console.error("\nCannot proceed due to connection issues.");
    }
  } catch (e) {
    console.error("Fatal error:", e);
  }
})();

// To run this script, first install the required dependency:
// npm install @supabase/supabase-js