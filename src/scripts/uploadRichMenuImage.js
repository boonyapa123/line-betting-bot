#!/usr/bin/env node

/**
 * Upload Rich Menu Image Script
 * อัปโหลดรูปภาพสำหรับ Rich Menu
 * 
 * Usage:
 *   npm run upload-rich-menu-image -- --image <path/to/image.jpg>
 *   npm run upload-rich-menu-image -- --image <path/to/image.jpg> --menu-id <RICH_MENU_ID>
 */

require('dotenv').config();
const { client } = require('../config/line');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Upload image to Rich Menu
 */
const uploadRichMenuImage = async (richMenuId, imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Image file not found:', imagePath);
      process.exit(1);
    }

    console.log('🖼️ Uploading image to Rich Menu:', richMenuId);
    console.log('   Image path:', imagePath);

    const imageBuffer = fs.readFileSync(imagePath);
    const fileSize = imageBuffer.length;

    console.log('   File size:', (fileSize / 1024).toFixed(2), 'KB');

    // Validate image size (max 1MB)
    if (fileSize > 1024 * 1024) {
      console.log('❌ Image size exceeds 1MB limit');
      process.exit(1);
    }

    await client.setRichMenuImage(richMenuId, imageBuffer, 'image/jpeg');
    console.log('✅ Image uploaded successfully!\n');

  } catch (error) {
    logger.error('Error uploading rich menu image', error);
    process.exit(1);
  }
};

/**
 * Get default Rich Menu ID
 */
const getDefaultRichMenuId = async () => {
  try {
    const richMenuId = await client.getDefaultRichMenuId();
    return richMenuId;
  } catch (error) {
    return null;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    console.log('\n🔧 Uploading Rich Menu Image...\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let imagePath = null;
    let richMenuId = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--image' && args[i + 1]) {
        imagePath = args[i + 1];
      }
      if (args[i] === '--menu-id' && args[i + 1]) {
        richMenuId = args[i + 1];
      }
    }

    // Use default image if not specified
    if (!imagePath) {
      imagePath = path.join(__dirname, '../assets/rich-menu.jpg');
      console.log('📝 Using default image:', imagePath);
    }

    // Get Rich Menu ID if not specified
    if (!richMenuId) {
      richMenuId = await getDefaultRichMenuId();
      if (!richMenuId) {
        console.log('❌ No Rich Menu found. Please create one first using "npm run setup-rich-menu"');
        process.exit(1);
      }
      console.log('📝 Using default Rich Menu ID:', richMenuId);
    }

    // Upload image
    await uploadRichMenuImage(richMenuId, imagePath);

  } catch (error) {
    logger.error('Error in upload rich menu image script', error);
    process.exit(1);
  }
};

main();
