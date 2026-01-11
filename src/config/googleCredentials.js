/**
 * Google Credentials Helper
 * อ่าน credentials จาก environment variable หรือ file
 */

const fs = require('fs');
const path = require('path');

/**
 * Get Google Credentials
 * ลำดับการค้นหา:
 * 1. GOOGLE_CREDENTIALS_PATH (สำหรับ Render secret files)
 * 2. GOOGLE_CREDENTIALS_JSON (สำหรับ environment variable)
 * 3. Default credentials files
 */
function getGoogleCredentials() {
  // ตัวเลือก 1: File path from environment (Render secret files)
  if (process.env.GOOGLE_CREDENTIALS_PATH) {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
    if (fs.existsSync(credentialsPath)) {
      try {
        console.log(`📝 Loading Google credentials from ${credentialsPath}`);
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      } catch (error) {
        console.error(`❌ Failed to read credentials from ${credentialsPath}:`, error.message);
        throw new Error(`Invalid credentials file: ${credentialsPath}`);
      }
    } else {
      console.warn(`⚠️ Credentials file not found at ${credentialsPath}`);
    }
  }

  // ตัวเลือก 2: JSON string credentials (Railway/Render environment variable)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      console.log('📝 Loading Google credentials from GOOGLE_CREDENTIALS_JSON');
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_CREDENTIALS_JSON:', error.message);
      // Don't throw, try other options
    }
  }

  // ตัวเลือก 3: Default credentials files
  const defaultPaths = [
    '/etc/secrets/google-credentials.json', // Render secret files
    './linebot-482513-5e72ad3d3232.json',
    './credentials.json',
    path.join(__dirname, '../../linebot-482513-5e72ad3d3232.json'),
    path.join(__dirname, '../../credentials.json'),
  ];

  for (const credentialsPath of defaultPaths) {
    if (fs.existsSync(credentialsPath)) {
      try {
        console.log(`📝 Loading Google credentials from ${credentialsPath}`);
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      } catch (error) {
        console.error(`❌ Failed to read credentials from ${credentialsPath}:`, error.message);
      }
    }
  }

  // ไม่พบ credentials
  throw new Error(
    'Google credentials not found. Please set GOOGLE_CREDENTIALS_PATH or place credentials file'
  );
}

/**
 * Get Google Auth Client
 * ใช้ credentials object โดยตรง แทน keyFile
 */
function getGoogleAuthClient(credentials) {
  const { google } = require('googleapis');
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });
}

module.exports = {
  getGoogleCredentials,
  getGoogleAuthClient
};
