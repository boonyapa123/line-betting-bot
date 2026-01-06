/**
 * LINE Bot SDK Configuration
 */

import { Client } from '@line/bot-sdk';
import { config } from './environment';

export const lineClient = new Client({
  channelAccessToken: config.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: config.LINE_CHANNEL_SECRET,
});

/**
 * Verify LINE webhook signature
 */
export const verifyLineSignature = (
  body: string,
  signature: string
): boolean => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', config.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return hash === signature;
};

/**
 * Send message to LINE
 */
export const sendLineMessage = async (
  userId: string,
  message: any
): Promise<void> => {
  try {
    await lineClient.pushMessage(userId, message);
  } catch (error) {
    console.error('❌ Error sending LINE message:', error);
    throw error;
  }
};

/**
 * Reply to LINE message
 */
export const replyLineMessage = async (
  replyToken: string,
  message: any
): Promise<void> => {
  try {
    await lineClient.replyMessage(replyToken, message);
  } catch (error) {
    console.error('❌ Error replying to LINE message:', error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<any> => {
  try {
    const profile = await lineClient.getProfile(userId);
    return profile;
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    throw error;
  }
};

/**
 * Get group summary
 */
export const getGroupSummary = async (groupId: string): Promise<any> => {
  try {
    const summary = await lineClient.getGroupSummary(groupId);
    return summary;
  } catch (error) {
    console.error('❌ Error getting group summary:', error);
    throw error;
  }
};

/**
 * Get group members count
 */
export const getGroupMembersCount = async (groupId: string): Promise<number> => {
  try {
    const count = await lineClient.getGroupMembersCount(groupId);
    return count;
  } catch (error) {
    console.error('❌ Error getting group members count:', error);
    throw error;
  }
};
