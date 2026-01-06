#!/usr/bin/env node

/**
 * Generate Rich Menu Image Script
 * สร้างรูปภาพ Rich Menu โดยอัตโนมัติ
 * 
 * Requires: canvas or sharp library
 * 
 * Usage:
 *   npm run generate-rich-menu-image
 *   npm run generate-rich-menu-image -- --output <path/to/output.jpg>
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate Rich Menu Image using Canvas
 * Note: This requires 'canvas' package to be installed
 */
const generateImageWithCanvas = async () => {
  try {
    const Canvas = require('canvas');
    const canvas = Canvas.createCanvas(2400, 1686);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 2400, 1686);

    // Border
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 2400, 1686);

    // Row 1 dividers
    ctx.beginPath();
    ctx.moveTo(800, 0);
    ctx.lineTo(800, 843);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(1600, 0);
    ctx.lineTo(1600, 843);
    ctx.stroke();

    // Row 2 divider
    ctx.beginPath();
    ctx.moveTo(1200, 843);
    ctx.lineTo(1200, 1686);
    ctx.stroke();

    // Horizontal divider
    ctx.beginPath();
    ctx.moveTo(0, 843);
    ctx.lineTo(2400, 843);
    ctx.stroke();

    // Text styling
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Button texts
    const buttons = [
      { x: 400, y: 421, text: '📋\nเปิดแทง' },
      { x: 1200, y: 421, text: '🏟️\nส่งห้องแข่ง' },
      { x: 2000, y: 421, text: '💳\nส่งลิงค์โอน' },
      { x: 600, y: 1264, text: '📊\nสรุปยอด' },
      { x: 1800, y: 1264, text: '🏆\nแจ้งผลแทง' },
    ];

    buttons.forEach((btn) => {
      const lines = btn.text.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, btn.x, btn.y + (idx - 0.5) * 100);
      });
    });

    // Save image
    const buffer = canvas.toBuffer('image/jpeg');
    return buffer;
  } catch (error) {
    console.log('⚠️ Canvas library not available');
    return null;
  }
};

/**
 * Generate Rich Menu Image using Sharp
 * Note: This requires 'sharp' package to be installed
 */
const generateImageWithSharp = async () => {
  try {
    const sharp = require('sharp');

    // Create SVG
    const svg = `
      <svg width="2400" height="1686" xmlns="http://www.w3.org/2000/svg">
        <rect width="2400" height="1686" fill="white"/>
        
        <!-- Borders -->
        <line x1="800" y1="0" x2="800" y2="843" stroke="#CCCCCC" stroke-width="2"/>
        <line x1="1600" y1="0" x2="1600" y2="843" stroke="#CCCCCC" stroke-width="2"/>
        <line x1="0" y1="843" x2="2400" y2="843" stroke="#CCCCCC" stroke-width="2"/>
        <line x1="1200" y1="843" x2="1200" y2="1686" stroke="#CCCCCC" stroke-width="2"/>
        
        <!-- Row 1 Buttons -->
        <text x="400" y="350" font-size="100" font-weight="bold" text-anchor="middle" fill="#333333">📋</text>
        <text x="400" y="500" font-size="80" font-weight="bold" text-anchor="middle" fill="#333333">เปิดแทง</text>
        
        <text x="1200" y="350" font-size="100" font-weight="bold" text-anchor="middle" fill="#333333">🏟️</text>
        <text x="1200" y="500" font-size="80" font-weight="bold" text-anchor="middle" fill="#333333">ส่งห้องแข่ง</text>
        
        <text x="2000" y="350" font-size="100" font-weight="bold" text-anchor="middle" fill="#333333">💳</text>
        <text x="2000" y="500" font-size="80" font-weight="bold" text-anchor="middle" fill="#333333">ส่งลิงค์โอน</text>
        
        <!-- Row 2 Buttons -->
        <text x="600" y="1150" font-size="100" font-weight="bold" text-anchor="middle" fill="#333333">📊</text>
        <text x="600" y="1300" font-size="80" font-weight="bold" text-anchor="middle" fill="#333333">สรุปยอด</text>
        
        <text x="1800" y="1150" font-size="100" font-weight="bold" text-anchor="middle" fill="#333333">🏆</text>
        <text x="1800" y="1300" font-size="80" font-weight="bold" text-anchor="middle" fill="#333333">แจ้งผลแทง</text>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
    return buffer;
  } catch (error) {
    console.log('⚠️ Sharp library not available');
    return null;
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    console.log('\n🎨 Generating Rich Menu Image...\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    let outputPath = path.join(__dirname, '../assets/rich-menu.jpg');

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--output' && args[i + 1]) {
        outputPath = args[i + 1];
      }
    }

    // Create assets directory if not exists
    const assetsDir = path.dirname(outputPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Try to generate image
    let buffer = await generateImageWithSharp();
    if (!buffer) {
      buffer = await generateImageWithCanvas();
    }

    if (!buffer) {
      console.log('❌ Could not generate image. Please install "sharp" or "canvas" package:');
      console.log('   npm install sharp');
      console.log('   or');
      console.log('   npm install canvas');
      process.exit(1);
    }

    // Save image
    fs.writeFileSync(outputPath, buffer);
    const fileSize = (buffer.length / 1024).toFixed(2);

    console.log('✅ Rich Menu image generated successfully!');
    console.log('   Output:', outputPath);
    console.log('   Size:', fileSize, 'KB');
    console.log('\n💡 Next step: Run "npm run upload-rich-menu-image" to upload it\n');

  } catch (error) {
    console.error('❌ Error generating image:', error.message);
    process.exit(1);
  }
};

main();
