#!/usr/bin/env node

/**
 * Encode Google Credentials to Base64
 * Usage: node scripts/encode-credentials.js <path-to-credentials.json>
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
  const base64Encoded = Buffer.from(credentialsContent).toString('base64');
  
  console.log('✅ Credentials encoded successfully\n');
  console.log('📝 Add this to your .env file:\n');
  console.log(`GOOGLE_CREDENTIALS_BASE64=${base64Encoded}\n`);
  
  // Also save to a file for reference
  const outputPath = path.join(path.dirname(credentialsPath), 'credentials-base64.txt');
  fs.writeFileSync(outputPath, base64Encoded);
  console.log(`💾 Saved to: ${outputPath}`);
} catch (error) {
  console.error('❌ Error encoding credentials:', error.message);
  process.exit(1);
}
