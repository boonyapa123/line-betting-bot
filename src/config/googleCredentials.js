/**
 * Google Credentials Helper
 * อ่าน credentials จาก environment variable หรือ file
 */

const fs = require('fs');
const path = require('path');

/**
 * Get Google Credentials
 * ลำดับการค้นหา:
 * 1. GOOGLE_CREDENTIALS_BASE64 (สำหรับ Railway)
 * 2. GOOGLE_CREDENTIALS_JSON (สำหรับ Railway)
 * 3. GOOGLE_CREDENTIALS_PATH (สำหรับ local)
 * 4. ./credentials.json (default)
 */
function getGoogleCredentials() {
  // ตัวเลือก 1: Base64 encoded credentials (Railway)
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    try {
      console.log('📝 Loading Google credentials from GOOGLE_CREDENTIALS_BASE64');
      const credentialsJson = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf-8');
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_CREDENTIALS_BASE64:', error.message);
      throw new Error('Invalid GOOGLE_CREDENTIALS_BASE64 format');
    }
  }

  // ตัวเลือก 2: JSON string credentials (Railway)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      console.log('📝 Loading Google credentials from GOOGLE_CREDENTIALS_JSON');
      return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_CREDENTIALS_JSON:', error.message);
      throw new Error('Invalid GOOGLE_CREDENTIALS_JSON format');
    }
  }

  // ตัวเลือก 3: File path (local development)
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  
  if (fs.existsSync(credentialsPath)) {
    try {
      console.log(`📝 Loading Google credentials from ${credentialsPath}`);
      return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    } catch (error) {
      console.error(`❌ Failed to read credentials from ${credentialsPath}:`, error.message);
      throw new Error(`Invalid credentials file: ${credentialsPath}`);
    }
  }

  // ไม่พบ credentials
  throw new Error(
    'Google credentials not found. Please set one of: ' +
    'GOOGLE_CREDENTIALS_BASE64, GOOGLE_CREDENTIALS_JSON, or GOOGLE_CREDENTIALS_PATH'
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
