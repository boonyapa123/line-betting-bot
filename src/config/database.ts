/**
 * Database Configuration
 */

import mongoose from 'mongoose';
import { config } from './environment';

let isConnected = false;

/**
 * Connect to MongoDB
 */
export const connectDatabase = async (): Promise<boolean> => {
  if (isConnected) {
    console.log('✅ Database already connected');
    return true;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(config.MONGODB_URI, {
      dbName: config.DATABASE_NAME,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    return false;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      isConnected = false;
      console.log('✅ MongoDB disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};

/**
 * Get database connection status
 */
export const getDatabaseStatus = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Get mongoose connection
 */
export const getConnection = () => {
  return mongoose.connection;
};
