const { client } = require('../config/line');

/**
 * Extract user information from LINE event
 */
const extractUserInfo = async (event) => {
  try {
    const userId = event.source.userId;
    let lineName = 'Unknown';
    let displayName = 'Unknown';

    // Get user profile from LINE API
    try {
      const profile = await client.getProfile(userId);
      lineName = profile.displayName;
      displayName = profile.displayName;
    } catch (error) {
      console.warn(`Could not fetch profile for user ${userId}:`, error.message);
      // Use a default name if profile fetch fails
      lineName = `User_${userId.substring(0, 8)}`;
    }

    return {
      userId,
      lineName,
      displayName,
      sourceType: event.source.type, // 'user', 'group', 'room'
      sourceId: event.source.groupId || event.source.roomId || userId,
    };
  } catch (error) {
    console.error('Error extracting user info:', error);
    throw error;
  }
};

/**
 * Get user profile by userId
 */
const getUserProfile = async (userId) => {
  try {
    const profile = await client.getProfile(userId);
    return {
      userId,
      lineName: profile.displayName,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error(`Error getting profile for user ${userId}:`, error);
    return {
      userId,
      lineName: `User_${userId.substring(0, 8)}`,
      displayName: `User_${userId.substring(0, 8)}`,
    };
  }
};

module.exports = {
  extractUserInfo,
  getUserProfile,
};
