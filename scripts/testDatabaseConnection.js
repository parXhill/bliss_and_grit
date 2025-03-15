// scripts/testDatabaseConnection.js
const { Pool } = require('pg');
require('dotenv').config();

// Display connection info (without sensitive data)
function parseDbUrl(url) {
  try {
    const mask = str => '******';
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      return {
        user: match[1],
        password: mask(match[2]),
        host: match[3],
        port: match[4],
        database: match[5].split('?')[0], // Remove query parameters
        ssl: url.includes('sslmode=') ? url.match(/sslmode=([^&]+)/)[1] : 'not specified'
      };
    }
    return { raw: url.replace(/:[^:@]+@/, ':******@') };
  } catch (err) {
    return { error: err.message, raw: url ? url.substring(0, 10) + '...' : 'undefined' };
  }
}

console.log("Attempting to connect to database with:");
console.log(parseDbUrl(process.env.DATABASE_URL));

// First try: SSL disabled
async function testSSLDisabled() {
  console.log("\n-------------------------------");
  console.log("TEST 1: Connection with SSL disabled");
  console.log("-------------------------------");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    try {
      console.log("✅ Connection established! (SSL disabled)");
      const result = await client.query('SELECT current_database() as db_name, version() as version');
      console.log("✅ Query successful!");
      console.log("Database:", result.rows[0].db_name);
      console.log("Version:", result.rows[0].version);
      return true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.log("❌ Connection failed:", err.message);
    return false;
  }
}

// Second try: SSL with rejectUnauthorized: false
async function testSSLUnverified() {
  console.log("\n-------------------------------");
  console.log("TEST 2: Connection with SSL (certificate validation disabled)");
  console.log("-------------------------------");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    try {
      console.log("✅ Connection established! (SSL unverified)");
      const result = await client.query('SELECT COUNT(*) as episode_count FROM "Episode"');
      console.log("✅ Query successful!");
      console.log(`Found ${result.rows[0].episode_count} episodes in the database`);
      
      // Also test segment table
      const segmentResult = await client.query('SELECT COUNT(*) as segment_count FROM "Segment"');
      console.log(`Found ${segmentResult.rows[0].segment_count} segments in the database`);
      
      return true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.log("❌ Connection failed:", err.message);
    return false;
  }
}

// Third try: Use the URL as is without modification
async function testURLAsIs() {
  console.log("\n-------------------------------");
  console.log("TEST 3: Connection using URL exactly as provided");
  console.log("-------------------------------");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const client = await pool.connect();
    try {
      console.log("✅ Connection established! (URL as is)");
      const result = await client.query('SELECT current_database() as db');
      console.log("✅ Query successful!");
      console.log("Connected to database:", result.rows[0].db);
      return true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.log("❌ Connection failed:", err.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  let success = false;
  
  // Test 1: SSL Disabled
  success = await testSSLDisabled();
  if (success) {
    console.log("\n✅ Successfully connected with SSL disabled");
  }
  
  // Test 2: SSL Unverified
  success = await testSSLUnverified();
  if (success) {
    console.log("\n✅ Successfully connected with SSL certificate validation disabled");
  }
  
  // Test 3: URL as is
  success = await testURLAsIs();
  if (success) {
    console.log("\n✅ Successfully connected using the URL exactly as provided");
  }
  
  if (!success) {
    console.log("\n❌ All connection attempts failed!");
    console.log("\nTroubleshooting suggestions:");
    console.log("1. Check your DATABASE_URL in .env file");
    console.log("2. Verify database server is running and accessible");
    console.log("3. Check if your database requires SSL (most cloud providers do)");
    console.log("4. Try modifying your DATABASE_URL to include ?sslmode=no-verify at the end");
  }
}

runTests();