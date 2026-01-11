#!/usr/bin/env node

/**
 * Generate JSON string for Google Credentials
 * Usage: node scripts/generate-json-credentials.js <path-to-credentials.json>
 */

const fs = require('fs');
const path = require('path');

const credentialsPath = process.argv[2] || './linebot-482513-5e72ad3d3232.json';

if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ Credentials file not found: ${credentialsPath}`);
  process.exit(1);
}

try {
  const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
  const credentialsJson = JSON.parse(credentialsContent);
  const jsonString = JSON.stringify(credentialsJson);
  
  console.log('✅ Credentials converted to JSON string\n');
  console.log('📝 Add this to your Railway environment variables:\n');
  console.log(`GOOGLE_CREDENTIALS_JSON=${jsonString}\n`);
  
  // Also save to a file for reference
  const outputPath = path.join(path.dirname(credentialsPath), 'credentials-json.txt');
  fs.writeFileSync(outputPath, jsonString);
  console.log(`💾 Saved to: ${outputPath}`);
} catch (error) {
  console.error('❌ Error converting credentials:', error.message);
  process.exit(1);
}
