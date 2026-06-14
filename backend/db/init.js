const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('../config/env');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is not set in backend/.env file.');
  process.exit(1);
}

// Supabase requires SSL connection
const client = new Client({
  connectionString: connectionString,
  ssl: connectionString.includes('supabase') || connectionString.includes('pooler')
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully. Reading schema.sql...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema queries...');
    await client.query(sql);
    console.log('Database tables initialized successfully!');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  } finally {
    await client.end();
  }
}

initDb();
