/**
 * Environment Configuration
 */

export const config = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // LINE Bot
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/line-betting-bot',
  DATABASE_NAME: process.env.DATABASE_NAME || 'line-betting-bot',

  // Google Sheets (if using)
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH || '',

  // Admin Group ID (for admin notifications)
  ADMIN_GROUP_ID: process.env.ADMIN_GROUP_ID || '',

  // LIFF Configuration
  LIFF_ID: process.env.LIFF_ID || '',
  LIFF_URL: process.env.LIFF_URL || 'https://liff.line.me',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Features
  USE_GOOGLE_SHEETS: process.env.USE_GOOGLE_SHEETS === 'true',
  USE_MONGODB: process.env.USE_MONGODB !== 'false',
};

/**
 * Validate required environment variables
 */
export const validateConfig = (): boolean => {
  const required = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
  ];

  const missing = required.filter(key => !config[key as keyof typeof config]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }

  return true;
};
