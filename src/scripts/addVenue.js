require('dotenv').config();
const { connectDB } = require('../config/database');
const { addVenue } = require('../services/venueService');
const logger = require('../utils/logger');

/**
 * Script to add a new venue
 * Usage: node src/scripts/addVenue.js <venueName> <roomLink> [paymentLink]
 */
const main = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.log('Usage: node src/scripts/addVenue.js <venueName> <roomLink> [paymentLink]');
      console.log('Example: node src/scripts/addVenue.js ต https://example.com/room-t https://example.com/payment');
      process.exit(1);
    }

    const venueName = args[0];
    const roomLink = args[1];
    const paymentLink = args[2] || null;

    logger.info('Adding venue', { venueName, roomLink, paymentLink });

    const result = await addVenue(venueName, roomLink, paymentLink);

    if (!result.success) {
      logger.error('Failed to add venue', result.error);
      console.error(`❌ ${result.error}`);
      process.exit(1);
    }

    logger.info('Venue added successfully', result.venue);
    console.log(`✅ เพิ่มสนามสำเร็จ`);
    console.log(`ชื่อสนาม: ${result.venue.name}`);
    console.log(`ลิงค์ห้องแทง: ${result.venue.roomLink}`);
    if (result.venue.paymentLink) {
      console.log(`ลิงค์ชำระเงิน: ${result.venue.paymentLink}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error in addVenue script', error);
    console.error(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    process.exit(1);
  }
};

main();
