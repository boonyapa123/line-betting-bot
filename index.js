require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));

// Multer สำหรับรับไฟล์
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ไฟล์ต้องเป็น JPEG หรือ PNG เท่านั้น'));
    }
  },
});

// Add logging middleware for Slip2Go webhook
app.use((req, res, next) => {
  if (req.path === '/slip2go/slip-verified') {
    console.log('\n🔔 Slip2Go webhook received');
    console.log(`   Path: ${req.path}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// ===== CONFIGURATION =====
// Account 1 (Primary - Verify betting data)
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;

// Account 2 (Same as Account 1)
const LINE_CHANNEL_SECRET_2 = process.env.LINE_CHANNEL_SECRET_2;
const LINE_CHANNEL_ACCESS_TOKEN_2 = process.env.LINE_CHANNEL_ACCESS_TOKEN_2;
const LINE_CHANNEL_ID_2 = process.env.LINE_CHANNEL_ID_2;

// Account 3 (Slip Verification & Balance Management)
const LINE_CHANNEL_SECRET_3 = process.env.LINE_CHANNEL_SECRET_3;
const LINE_CHANNEL_ACCESS_TOKEN_3 = process.env.LINE_CHANNEL_ACCESS_TOKEN_3;
const LINE_CHANNEL_ID_3 = process.env.LINE_CHANNEL_ID_3;

// Google Sheets
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_WORKSHEET_NAME = process.env.GOOGLE_WORKSHEET_NAME || 'Bets';

// Helper to get correct credentials based on channel ID
function getLineCredentials(channelId) {
  if (channelId === LINE_CHANNEL_ID) {
    return {
      secret: LINE_CHANNEL_SECRET,
      token: LINE_CHANNEL_ACCESS_TOKEN
    };
  } else if (channelId === LINE_CHANNEL_ID_2) {
    return {
      secret: LINE_CHANNEL_SECRET_2,
      token: LINE_CHANNEL_ACCESS_TOKEN_2
    };
  } else if (channelId === LINE_CHANNEL_ID_3) {
    return {
      secret: LINE_CHANNEL_SECRET_3,
      token: LINE_CHANNEL_ACCESS_TOKEN_3
    };
  }
  return null;
}

// Load groups data
let groupsData = {};
try {
  groupsData = JSON.parse(fs.readFileSync('data/groups.json', 'utf8'));
  console.log('✅ Groups data loaded');
} catch (error) {
  console.log('⚠️  Groups data file not found, starting with empty groups');
  groupsData = {};
}

// Save groups data to file
function saveGroupsData() {
  try {
    fs.writeFileSync('data/groups.json', JSON.stringify(groupsData, null, 2));
    console.log('✅ Groups data saved');
  } catch (error) {
    console.error('❌ Failed to save groups data:', error.message);
  }
}

// Register group with account
function registerGroup(groupId, groupName, accountNumber) {
  if (!groupsData[groupId]) {
    groupsData[groupId] = {
      id: groupId,
      name: groupName,
      account: accountNumber,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    saveGroupsData();
    console.log(`✅ Registered new group: ${groupName} (Account ${accountNumber})`);
  } else {
    // Update last active
    groupsData[groupId].lastActive = new Date().toISOString();
    saveGroupsData();
  }
}

// Get account number from channel ID
function getAccountNumber(channelId) {
  if (channelId === LINE_CHANNEL_ID) return 1;
  if (channelId === LINE_CHANNEL_ID_2) return 2;
  if (channelId === LINE_CHANNEL_ID_3) return 3;
  return null;
}

// Get groups for specific account
function getGroupsForAccount(accountNumber) {
  return Object.values(groupsData).filter(group => group.account === accountNumber);
}

// Load Google credentials
let googleAuth;
try {
  let credentials;
  
  // Try to load from environment variable first (for production)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    console.log('✅ Google Sheets credentials loaded from environment');
  } else {
    // Fall back to file (for local development)
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json';
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('✅ Google Sheets credentials loaded from file');
  }
  
  googleAuth = new GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} catch (error) {
  console.error('❌ Failed to load Google credentials:', error.message);
}

const sheets = google.sheets('v4');

// ===== HELPER FUNCTIONS =====

function validateLineSignature(signature, body, channelSecret) {
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// LINE API: Get user profile
async function getLineUserProfile(userId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const profile = JSON.parse(data);
          console.log(`      👤 Profile response:`, profile);
          if (profile.displayName) {
            resolve(profile.displayName);
          } else {
            console.log(`      ⚠️  No displayName in profile`);
            resolve('Unknown');
          }
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          resolve('Unknown');
        }
      });
    });

    req.on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown');
    });

    req.end();
  });
}

// LINE API: Get group name
async function getLineGroupName(groupId, accessToken) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/group/${groupId}/summary`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const summary = JSON.parse(data);
          console.log(`      🏘️  Group response:`, summary);
          resolve(summary.groupName || 'Unknown Group');
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          resolve('Unknown Group');
        }
      });
    }).on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown Group');
    }).end();
  });
}

// Get opposite bet type
function getOppositeBetType(betType) {
  const opposites = {
    'ชล': 'ถอย',
    'ถอย': 'ชล',
    'ชถ': 'ถอย',
    'ยั้ง': 'ล่าง',
    'ล่าง': 'ยั้ง',
    'บน': 'ล่าง',
    'ล่าง': 'บน',
    'ถ': 'ชล',
    'ช': 'ถอย',
    'ย': 'ล่าง',
    'ล': 'ยั้ง',
    'บ': 'ล่าง',
  };
  return opposites[betType] || '';
}

// Get opposite result symbol
function getOppositeResult(betType) {
  // This will be filled when result is announced
  // For now, return empty string
  return '';
}

// ===== RESULT PARSER =====
function parseResultMessage(message) {
  // Format: "ชื่อบั้งไฟ เลขที่ออก ✅/❌/⛔️"
  // Example: "อาจารย์อั๋น 310✅"
  
  const resultMatch = message.match(/(.+?)\s+(\d+)\s*(✅|❌|⛔️)/);
  if (!resultMatch) return null;
  
  return {
    fireworkName: resultMatch[1].trim(),
    resultNumber: resultMatch[2],
    result: resultMatch[3]
  };
}

// Find matching bets in Google Sheets
async function findMatchingBets(fireworkName, resultNumber) {
  if (!googleAuth) return [];
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:N`,
    });
    
    const rows = response.data.values || [];
    const matchingRows = [];
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;
      
      // Column E (index 4) = ชื่อบั้งไฟ
      const rowFireworkName = row[4] || '';
      
      // Check if firework name matches
      if (rowFireworkName.toLowerCase().includes(fireworkName.toLowerCase()) ||
          fireworkName.toLowerCase().includes(rowFireworkName.toLowerCase())) {
        matchingRows.push({
          rowIndex: i + 1,
          data: row,
          fireworkName: rowFireworkName
        });
      }
    }
    
    return matchingRows;
  } catch (error) {
    console.error('❌ Error finding matching bets:', error.message);
    return [];
  }
}

// Update result in Google Sheets
async function updateBetResult(rowIndex, resultNumber, resultSymbol, accessToken) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    // Column I (index 8) = ผลที่ออก
    // Column J (index 9) = ผลแพ้ชนะ User A
    // Column K (index 10) = ผลแพ้ชนะ User B (opposite)
    
    // Get opposite result for User B
    const oppositeResult = getOppositeResultSymbol(resultSymbol);
    
    // ดึงข้อมูลการเดิมพันจากชีท
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${rowIndex}:N${rowIndex}`,
    });
    
    const row = response.data.values?.[0] || [];
    const userAId = row[1] || '';
    const userAName = row[2] || '';
    const userBId = row[11] || '';
    const userBName = row[11] || '';
    const betAmount = parseFloat(row[6]) || 0;
    const fireworkName = row[4] || '';
    
    // อัปเดตผลลัพธ์ในชีท
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!I${rowIndex}:K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[resultNumber, resultSymbol, oppositeResult]],
      },
    });
    
    console.log(`   ✅ Updated row ${rowIndex}: ${resultNumber} | User A: ${resultSymbol} | User B: ${oppositeResult}`);
    
    // 💰 คำนวนแพ้ชนะและอัปเดตยอดเงิน
    console.log(`   💰 Calculating winnings and updating balances...`);
    
    let userAWinnings = 0;
    let userBWinnings = 0;
    
    if (resultSymbol === '✅') {
      // User A ชนะ
      const commission = betAmount * 0.1; // 10% commission
      userAWinnings = betAmount - commission;
      userBWinnings = -betAmount;
    } else if (resultSymbol === '❌') {
      // User A แพ้
      userAWinnings = -betAmount;
      const commission = betAmount * 0.1; // 10% commission
      userBWinnings = betAmount - commission;
    } else {
      // เสมอ
      const commission = betAmount * 0.05; // 5% commission
      userAWinnings = -commission;
      userBWinnings = -commission;
    }
    
    // อัปเดตยอดเงินของ User A
    if (userAId && userAName) {
      await updatePlayerBalance(userAId, userAName, userAWinnings);
    }
    
    // อัปเดตยอดเงินของ User B
    if (userBId && userBName) {
      await updatePlayerBalance(userBId, userBName, userBWinnings);
    }
    
    // 📤 ส่งข้อความแจ้งผลให้ผู้เล่นทั้งสองฝั่ง
    console.log(`   📤 Sending result messages to players...`);
    
    if (resultSymbol === '✅') {
      // User A ชนะ
      const messageA = `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${userAWinnings.toFixed(0)} บาท\n` +
        `👤 ผู้แพ้: ${userBName}\n\n` +
        `ยินดีด้วย! 🎉`;
      
      const messageB = `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(userBWinnings).toFixed(0)} บาท\n` +
        `👤 ผู้ชนะ: ${userAName}\n\n` +
        `ลองใหม่นะ 💪`;
      
      await sendLineMessageToUser(userAId, messageA, accessToken);
      await sendLineMessageToUser(userBId, messageB, accessToken);
    } else if (resultSymbol === '❌') {
      // User A แพ้
      const messageA = `❌ แพ้แล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 เสีย: ${Math.abs(userAWinnings).toFixed(0)} บาท\n` +
        `👤 ผู้ชนะ: ${userBName}\n\n` +
        `ลองใหม่นะ 💪`;
      
      const messageB = `✅ ชนะแล้ว\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `🏆 ได้รับ: ${userBWinnings.toFixed(0)} บาท\n` +
        `👤 ผู้แพ้: ${userAName}\n\n` +
        `ยินดีด้วย! 🎉`;
      
      await sendLineMessageToUser(userAId, messageA, accessToken);
      await sendLineMessageToUser(userBId, messageB, accessToken);
    } else {
      // เสมอ
      const messageA = `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(userAWinnings).toFixed(0)} บาท\n` +
        `👤 คู่แข่ง: ${userBName}\n\n` +
        `ผลเสมอ 🤝`;
      
      const messageB = `⛔️ เสมอ\n\n` +
        `🎆 บั้งไฟ: ${fireworkName}\n` +
        `💰 เดิมพัน: ${betAmount} บาท\n` +
        `💸 ค่าธรรมเนียม: ${Math.abs(userBWinnings).toFixed(0)} บาท\n` +
        `👤 คู่แข่ง: ${userAName}\n\n` +
        `ผลเสมอ 🤝`;
      
      await sendLineMessageToUser(userAId, messageA, accessToken);
      await sendLineMessageToUser(userBId, messageB, accessToken);
    }
    
    console.log(`   ✅ Result messages sent successfully`);
  } catch (error) {
    console.error('❌ Failed to update result:', error.message);
  }
}

async function updatePlayerBalance(userId, userName, winnings) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log(`   💰 Updating balance for ${userName}: ${winnings > 0 ? '+' : ''}${winnings.toFixed(0)} บาท`);
    
    // ดึงข้อมูลผู้เล่นจากชีท Players
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:D`,
    });
    
    const rows = response.data.values || [];
    let playerRowIndex = -1;
    let currentBalance = 0;
    
    // ค้นหาผู้เล่นตามชื่อหรือ Linked IDs
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      const playerName = row[0] || '';
      const linkedIds = row[1] ? JSON.parse(row[1]) : [];
      const balance = parseFloat(row[3]) || 0;
      
      if (playerName === userName || linkedIds.includes(userId)) {
        playerRowIndex = i + 1;
        currentBalance = balance;
        break;
      }
    }
    
    if (playerRowIndex > 0) {
      const newBalance = currentBalance + winnings;
      
      // อัปเดตยอดเงิน
      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Players!D${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newBalance]],
        },
      });
      
      console.log(`      ✅ Balance updated: ${currentBalance} → ${newBalance} บาท`);
    } else {
      console.log(`      ⚠️  Player not found in Players sheet`);
    }
  } catch (error) {
    console.error(`      ❌ Error updating balance: ${error.message}`);
  }
}

// Get opposite result symbol
function getOppositeResultSymbol(resultSymbol) {
  const opposites = {
    '✅': '❌',
    '❌': '✅',
    '⛔️': '⛔️'
  };
  return opposites[resultSymbol] || '';
}

// ===== CALCULATION FUNCTIONS =====

function calculateWinnings(amount, result) {
  const betAmount = parseInt(amount) || 0;
  
  if (result === '✅') {
    // Win: deduct 10% commission
    const commission = betAmount * 0.1;
    const winnings = betAmount + (betAmount - commission);
    return {
      commission: commission,
      winnings: winnings,
      net: winnings - betAmount
    };
  } else if (result === '❌') {
    // Loss: lose the bet amount
    return {
      commission: 0,
      winnings: 0,
      net: -betAmount
    };
  } else if (result === '⛔️') {
    // Draw: deduct 5% from both
    const commission = betAmount * 0.05;
    const returned = betAmount - commission;
    return {
      commission: commission,
      winnings: returned,
      net: -commission
    };
  }
  
  return {
    commission: 0,
    winnings: 0,
    net: 0
  };
}

async function generateBettingSummary(groupId, sourceType, accountNumber) {
  if (!googleAuth) {
    return 'ไม่สามารถเข้าถึง Google Sheets';
  }
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:N`,
    });
    
    const rows = response.data.values || [];
    const bets = [];
    let currentGroupName = 'Unknown Group';
    
    console.log(`📊 Total rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`   Header (${rows[0].length} cols): ${JSON.stringify(rows[0])}`);
    }
    if (rows.length > 1) {
      console.log(`   Row 1 (${rows[1].length} cols): ${JSON.stringify(rows[1])}`);
    }
    
    // Get groups for this account
    const accountGroups = getGroupsForAccount(accountNumber);
    const accountGroupNames = accountGroups.map(g => g.name);
    console.log(`   📍 Groups for Account ${accountNumber}: ${accountGroupNames.join(', ')}`);
    
    // Parse all bets (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 1) continue;
      
      // Column N (index 13) = ชื่อกลุ่มแชท
      let rowGroupName = '';
      if (row.length > 13) {
        rowGroupName = row[13] || '';
      }
      
      if (i <= 3) {
        console.log(`   Row ${i}: length=${row.length}, col13="${rowGroupName}"`);
      }
      
      // Only include bets from groups in this account
      if (!accountGroupNames.includes(rowGroupName)) {
        continue;
      }
      
      // Store group name from any row that has it
      if (rowGroupName && currentGroupName === 'Unknown Group') {
        currentGroupName = rowGroupName;
        console.log(`   ✅ Found group name: ${currentGroupName}`);
      }
      
      // Column J (index 9) = ผลแพ้ชนะ User A
      // Column K (index 10) = ผลแพ้ชนะ User B
      const resultA = row[9] || '';
      const resultB = row[10] || '';
      
      // Only include bets with results
      if (!resultA && !resultB) continue;
      
      bets.push({
        timestamp: row[0],
        userA: row[1],
        userAName: row[2],
        messageA: row[3],
        fireworkName: row[4],
        betTypeA: row[5],
        amount: row[6],
        resultNumber: row[8],
        resultA: resultA,
        resultB: resultB,
        userB: row[11],
        userBName: row[11],
        betTypeB: row[12],
        groupName: rowGroupName
      });
    }
    
    if (bets.length === 0) {
      return '📊 ยังไม่มีการแทงที่มีผลลัพธ์';
    }
    
    // Group by pairs
    const pairs = {};
    for (const bet of bets) {
      const pairKey = `${bet.userAName} vs ${bet.userBName}`;
      if (!pairs[pairKey]) {
        pairs[pairKey] = {
          userAName: bet.userAName,
          userBName: bet.userBName,
          bets: []
        };
      }
      pairs[pairKey].bets.push(bet);
    }
    
    // Generate summary
    let summary = '📊 สรุปยอดแทง 1on1\n';
    summary += '═══════════════════\n\n';
    
    // Add group names if available
    const uniqueGroups = [...new Set(bets.map(b => b.groupName))];
    if (uniqueGroups.length > 0) {
      summary += `🏘️  กลุ่มแชท: ${uniqueGroups.join(', ')}\n`;
      summary += '═══════════════════\n\n';
    }
    
    for (const [pairKey, pairData] of Object.entries(pairs)) {
      let userAWins = 0;
      let userBWins = 0;
      let draws = 0;
      let totalAmount = 0;
      let userATotal = 0;
      let userBTotal = 0;
      let userACommission = 0;
      let userBCommission = 0;
      
      summary += `🎯 ${pairData.userAName} vs ${pairData.userBName}\n`;
      
      for (const bet of pairData.bets) {
        const betAmount = parseInt(bet.amount) || 0;
        totalAmount += betAmount;
        
        // Show bet details
        summary += `\n   📝 ${bet.messageA}\n`;
        summary += `   ผลที่ออก: ${bet.resultNumber}\n`;
        summary += `   ยอดเดิมพัน: ${betAmount} บาท\n`;
        
        if (bet.resultA === '✅') {
          userAWins++;
          const calcA = calculateWinnings(betAmount, '✅');
          const calcB = calculateWinnings(betAmount, '❌');
          
          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;
          
          summary += `   ✅ ${pairData.userAName} ชนะ\n`;
          summary += `      ได้รับ: ${calcA.winnings.toFixed(0)} บาท (หัก 10%: ${calcA.commission.toFixed(0)} บาท)\n`;
          summary += `      ${pairData.userBName} เสีย: ${betAmount} บาท\n`;
        } else if (bet.resultA === '❌') {
          userBWins++;
          const calcA = calculateWinnings(betAmount, '❌');
          const calcB = calculateWinnings(betAmount, '✅');
          
          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;
          
          summary += `   ❌ ${pairData.userBName} ชนะ\n`;
          summary += `      ${pairData.userAName} เสีย: ${betAmount} บาท\n`;
          summary += `      ได้รับ: ${calcB.winnings.toFixed(0)} บาท (หัก 10%: ${calcB.commission.toFixed(0)} บาท)\n`;
        } else if (bet.resultA === '⛔️') {
          draws++;
          const calcA = calculateWinnings(betAmount, '⛔️');
          const calcB = calculateWinnings(betAmount, '⛔️');
          
          userATotal += calcA.net;
          userBTotal += calcB.net;
          userACommission += calcA.commission;
          userBCommission += calcB.commission;
          
          summary += `   🤝 เสมอ\n`;
          summary += `      ${pairData.userAName} ได้รับ: ${calcA.winnings.toFixed(0)} บาท (หัก 5%: ${calcA.commission.toFixed(0)} บาท)\n`;
          summary += `      ${pairData.userBName} ได้รับ: ${calcB.winnings.toFixed(0)} บาท (หัก 5%: ${calcB.commission.toFixed(0)} บาท)\n`;
        }
      }
      
      summary += `\n   ═══════════════════\n`;
      summary += `   📊 สรุปผลลัพธ์:\n`;
      summary += `   ${pairData.userAName}: ${userAWins} ชนะ | ${userBWins} แพ้ | ${draws} เสมอ\n`;
      summary += `   ${pairData.userBName}: ${userBWins} ชนะ | ${userAWins} แพ้ | ${draws} เสมอ\n`;
      summary += `\n   💰 ยอดรวม:\n`;
      summary += `   ${pairData.userAName}: ${userATotal >= 0 ? '+' : ''}${userATotal.toFixed(0)} บาท (หัก commission: ${userACommission.toFixed(0)} บาท)\n`;
      summary += `   ${pairData.userBName}: ${userBTotal >= 0 ? '+' : ''}${userBTotal.toFixed(0)} บาท (หัก commission: ${userBCommission.toFixed(0)} บาท)\n`;
      summary += `   📝 รายการ: ${pairData.bets.length} ครั้ง\n\n`;
    }
    
    return summary;
  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
    return 'เกิดข้อผิดพลาดในการสรุปยอด';
  }
}

// Send LINE message
async function sendLineMessage(groupId, message, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: groupId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    });
    
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   ✅ Message sent`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error sending message:`, err.message);
      resolve(false);
    }).write(body);
  });
}

function extractBetAmount(message) {
  if (!message) return null;
  
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/[ตยสล](\d+)/);
  if (newFormatMatch) {
    const amount = parseInt(newFormatMatch[1]);
    if (amount >= 10) {
      console.log(`      ✅ Bet amount (new format): ${amount}`);
      return amount;
    }
  }
  
  // รูปแบบเดิม: Get all numbers
  const numbers = message.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  
  // Find last whole number >= 10
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = parseFloat(numbers[i]);
    if (Number.isInteger(num) && num >= 10) {
      console.log(`      ✅ Bet amount: ${num}`);
      return num;
    }
  }
  
  return null;
}

function extractBetType(message) {
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/([ตยสล])(\d+)/);
  if (newFormatMatch) {
    const typeChar = newFormatMatch[1];
    const typeMap = {
      'ต': 'ต่ำ/ยั่ง',
      'ย': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
      'ล': 'สูง/ไล่'
    };
    const betType = typeMap[typeChar];
    console.log(`      ✅ Bet type (new format): ${betType}`);
    return betType;
  }
  
  // รูปแบบเดิม
  const betTypes = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ชล': 'ชล',
    'ชถ': 'ชล',
    'สกัด': 'สกัด',
    'ติด': 'ยั้ง', // "ติด" = ยั้ง
    'ถ': 'ถอย',
    'ย': 'ยั้ง',
    'ล': 'ล่าง',
    'บ': 'บน',
  };
  
  for (const [key, value] of Object.entries(betTypes)) {
    if (message.includes(key)) {
      console.log(`      ✅ Bet type: ${value}`);
      return value;
    }
  }
  
  console.log(`      ❌ No bet type found`);
  return null;
}

function extractFireworkName(message) {
  // ลองค้นหาตัวเลขที่มีตัวคั่นก่อน (เช่น 310, 310.5, 310/5)
  const withSeparator = message.match(/\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*/);
  if (withSeparator) {
    console.log(`      ✅ Firework name (with separator): ${withSeparator[0]}`);
    return withSeparator[0];
  }
  
  // ถ้าไม่พบ ให้ค้นหาชื่อบั้งไฟที่เป็นข้อความ (เช่น "ลูกชายภูน้อย", "ชล", "ชถ")
  // ค้นหาคำแรกที่ไม่ใช่ตัวเลขและไม่ใช่ประเภทเดิมพัน
  const betTypes = ['ถอย', 'ยั้ง', 'ล่าง', 'บน', 'ชล', 'ชถ', 'สกัด', 'ต่ำ', 'สูง', 'ไล่', '✅', '❌', 'ต', 'ย', 'ส', 'ล'];
  
  // แยกข้อความเป็นคำ
  const words = message.split(/\s+/);
  
  for (const word of words) {
    // ข้ามคำที่เป็นตัวเลข
    if (/^\d+$/.test(word)) continue;
    
    // ข้ามคำที่เป็นประเภทเดิมพัน
    if (betTypes.includes(word)) continue;
    
    // ข้ามคำที่เป็นสัญลักษณ์
    if (['✅', '❌', 'ต', 'ย', 'ส', 'ล'].includes(word)) continue;
    
    // ถ้าเหลือคำ ให้ใช้เป็นชื่อบั้งไฟ
    if (word.length > 0) {
      console.log(`      ✅ Firework name (text): ${word}`);
      return word;
    }
  }
  
  console.log(`      ❌ No firework name found`);
  return null;
}

// ===== PAIR DETECTION =====
const messageMap = new Map(); // messageId -> message data
const recordedPairs = new Set();
const unsendLog = new Map(); // messageId -> unsend details

function detectPair(currentMessage) {
  const { userId, messageId, content, timestamp, groupId, quotedMessageId } = currentMessage;
  
  // Check if this is a reply to a previous message
  if (quotedMessageId && messageMap.has(quotedMessageId)) {
    const previousMessage = messageMap.get(quotedMessageId);
    
    // Don't create pair if User A and User B are the same person
    if (previousMessage.userId === userId) {
      console.log(`   ⚠️  Same user replying to own message (ignored)`);
      return null;
    }
    
    const pairId = `${quotedMessageId}:${messageId}`;
    
    if (!recordedPairs.has(pairId)) {
      recordedPairs.add(pairId);
      
      console.log(`✅ Pair detected`);
      console.log(`   User A: ${previousMessage.userId}`);
      console.log(`   User B: ${userId}`);
      
      return {
        userA: previousMessage.userId,
        messageA: previousMessage.content,
        timestampA: previousMessage.timestamp,
        userB: userId,
        messageB: content,
        timestampB: timestamp,
        groupId: groupId
      };
    }
  } else {
    // Store this message for future reply detection
    messageMap.set(messageId, {
      userId,
      content,
      timestamp,
      groupId,
      userName: null // Will be filled when needed
    });
    console.log(`   📦 Stored message with ID: ${messageId}`);
  }
  
  return null;
}

// ===== GOOGLE SHEETS =====
async function recordInitialBet(pair, userAName, groupName) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('📤 Recording initial bet to Google Sheets...');
    
    // Extract bet details
    const betDetailsA = {
      fireworkName: extractFireworkName(pair.messageA),
      betType: extractBetType(pair.messageA),
      betAmount: extractBetAmount(pair.messageA)
    };
    
    // Create row for initial bet (User B is empty)
    const date = new Date(pair.timestampA);
    const timestamp = date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const row = [
      timestamp,
      pair.userA,
      userAName,
      pair.messageA,
      betDetailsA.fireworkName || '',
      betDetailsA.betType || '',
      betDetailsA.betAmount || 0,
      betDetailsA.betAmount || 0,
      '',
      '',
      '',
      '', // User B Name (empty)
      '', // Bet Type B (empty)
      groupName
    ];
    
    console.log(`   📊 Initial bet row data (14 columns):`);
    row.forEach((val, idx) => {
      console.log(`      [${idx}]: "${val}"`);
    });
    
    // Get current row count
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values || [];
    const nextRowIndex = rows.length + 1;
    
    console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
    
    // Append row
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:N${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    console.log(`   ✅ Initial bet appended successfully to row ${nextRowIndex}`);
  } catch (error) {
    console.error(`❌ Error recording initial bet: ${error.message}`);
    throw error;
  }
}

async function appendToGoogleSheets(pair, userAName, userBName, groupName, matchType = 'reply') {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('📤 Recording to Google Sheets...');
    console.log(`   Match Type: ${matchType}`);
    
    // Extract bet details
    const betDetailsA = {
      fireworkName: extractFireworkName(pair.messageA),
      betType: extractBetType(pair.messageA),
      betAmount: extractBetAmount(pair.messageA)
    };
    
    const betDetailsB = {
      fireworkName: extractFireworkName(pair.messageB),
      betType: extractBetType(pair.messageB),
      betAmount: extractBetAmount(pair.messageB)
    };
    
    // 🎯 ตัดสินใจยอดเงินตามประเภทการจับคู่
    let betAmount;
    if (matchType === 'reply') {
      // Reply matching: ใช้ยอดเงินของ User A เป็นหลัก
      betAmount = betDetailsA.betAmount || 0;
      console.log(`   💰 Using User A amount (reply matching): ${betAmount} บาท`);
    } else if (matchType === 'auto') {
      // Auto matching: ใช้ยอดเงินน้อยกว่า
      betAmount = Math.min(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
      console.log(`   💰 Using minimum amount (auto matching): ${betAmount} บาท`);
    } else {
      // Default: ใช้ยอดสูงสุด (legacy)
      betAmount = Math.max(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
      console.log(`   💰 Using maximum amount (legacy): ${betAmount} บาท`);
    }
    
    // Get opposite bet type for User B
    const oppositeBetType = getOppositeBetType(betDetailsA.betType);
    
    // Create row
    // timestamp from LINE is in milliseconds
    const date = new Date(pair.timestampB);
    const timestamp = date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Get opposite result for User B
    const userBResult = getOppositeResult(betDetailsA.betType);
    
    const row = [
      timestamp,
      pair.userA,
      userAName,
      pair.messageA,
      betDetailsA.fireworkName || '',
      betDetailsA.betType || '',
      betAmount,
      betAmount,
      '',
      '',
      userBResult,
      userBName,
      oppositeBetType,
      groupName
    ];
    
    console.log(`   📊 Row data (14 columns):`);
    row.forEach((val, idx) => {
      console.log(`      [${idx}]: "${val}"`);
    });
    
    // Get current row count
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values || [];
    const nextRowIndex = rows.length + 1;
    
    console.log(`   📊 Current rows: ${rows.length}, appending to row ${nextRowIndex}`);
    
    // Append row
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A${nextRowIndex}:N${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    console.log(`   ✅ Row appended successfully to row ${nextRowIndex}`);
    
    // บันทึกข้อมูลผู้เล่น User A ถ้ายังไม่มี
    console.log(`📝 Recording Player A to Players sheet...`);
    try {
      await _recordPlayerToSheetFromSlip(
        googleAuth,
        GOOGLE_SHEET_ID,
        pair.userA,
        userAName,
        accessToken,
        0 // ไม่เพิ่มยอดเงิน เพราะเป็นการเดิมพัน
      );
      console.log(`   ✅ Player A recorded`);
    } catch (playerAError) {
      console.error(`   ⚠️  Failed to record Player A: ${playerAError.message}`);
    }
    
    // บันทึกข้อมูลผู้เล่น User B ถ้ายังไม่มี
    console.log(`📝 Recording Player B to Players sheet...`);
    try {
      await _recordPlayerToSheetFromSlip(
        googleAuth,
        GOOGLE_SHEET_ID,
        pair.userB,
        userBName,
        accessToken,
        0 // ไม่เพิ่มยอดเงิน เพราะเป็นการเดิมพัน
      );
      console.log(`   ✅ Player B recorded`);
    } catch (playerBError) {
      console.error(`   ⚠️  Failed to record Player B: ${playerBError.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to append to Google Sheets:', error.message);
  }
}

// ===== ROUTES =====

app.get('/health', (req, res) => {
  console.log('✅ Health check');
  res.status(200).json({ status: 'ok' });
});

// Test endpoint for Slip2Go webhook
app.post('/slip2go/test', async (req, res) => {
  try {
    console.log('\n🧪 Slip2Go webhook test');
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    
    const { userId, amount, status } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing userId or amount' });
    }
    
    console.log(`✅ Test data received: userId=${userId}, amount=${amount}, status=${status}`);
    res.status(200).json({ success: true, message: 'Test webhook received' });
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * ดาวน์โหลดรูปภาพจาก LINE
 */
async function downloadLineImage(messageId, accessToken) {
  try {
    const axios = require('axios');
    
    console.log(`   🔑 Access Token (first 30 chars): ${accessToken.substring(0, 30)}...`);
    console.log(`   🔑 Access Token length: ${accessToken.length}`);
    
    // Try LINE Messaging API endpoint (use api-data for content download)
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    
    try {
      console.log(`   📡 Trying: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      console.log(`   ✅ Downloaded (${response.data.length} bytes)`);
      return Buffer.from(response.data);
    } catch (error) {
      console.log(`   ⚠️  Failed: ${error.response?.status || error.message}`);
      if (error.response?.status === 404) {
        console.log(`   ℹ️  404 - Message not found or access denied`);
      } else if (error.response?.status === 401) {
        console.log(`   ℹ️  401 - Unauthorized (invalid token)`);
      } else if (error.response?.status === 400) {
        console.log(`   ℹ️  400 - Bad request`);
      }
      
      if (error.response?.data) {
        try {
          const errorData = JSON.parse(error.response.data.toString());
          console.log(`   Response: ${JSON.stringify(errorData)}`);
        } catch (e) {
          console.log(`   Response: ${error.response.data.toString().substring(0, 200)}`);
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * ส่งข้อความไปยังผู้ใช้ LINE
 */
async function sendLineMessageToUser(userId, message, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      to: userId,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    });

    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/push',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`   ✅ Message sent successfully`);
        } else {
          console.log(`   ⚠️  Message send status: ${res.statusCode}`);
        }
        resolve(true);
      });
    })
      .on('error', (err) => {
        console.log(`   ❌ Error sending message: ${err.message}`);
        resolve(false);
      })
      .write(body);
  });
}

// ===== WEBHOOK HANDLER =====
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'];
    const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    
    console.log('\n🔔 Webhook received');
    console.log(`   Signature: ${signature}`);
    console.log(`   Body length: ${body.length}`);
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    
    // Determine which account this webhook is for
    let credentials = null;
    let channelId = null;
    
    // Try account 1 first
    if (validateLineSignature(signature, body, LINE_CHANNEL_SECRET)) {
      credentials = { secret: LINE_CHANNEL_SECRET, token: LINE_CHANNEL_ACCESS_TOKEN };
      channelId = LINE_CHANNEL_ID;
      console.log(`   ✅ Validated with Account 1`);
    } 
    // Try account 2
    else if (LINE_CHANNEL_SECRET_2 && validateLineSignature(signature, body, LINE_CHANNEL_SECRET_2)) {
      credentials = { secret: LINE_CHANNEL_SECRET_2, token: LINE_CHANNEL_ACCESS_TOKEN_2 };
      channelId = LINE_CHANNEL_ID_2;
      console.log(`   ✅ Validated with Account 2`);
    }
    // Try account 3
    else if (LINE_CHANNEL_SECRET_3 && validateLineSignature(signature, body, LINE_CHANNEL_SECRET_3)) {
      credentials = { secret: LINE_CHANNEL_SECRET_3, token: LINE_CHANNEL_ACCESS_TOKEN_3 };
      channelId = LINE_CHANNEL_ID_3;
      console.log(`   ✅ Validated with Account 3`);
    }
    // Invalid signature
    else {
      console.log('❌ Invalid signature');
      console.log(`   Expected (Account 1): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(body).digest('base64')}`);
      console.log(`   Expected (Account 2): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET_2).update(body).digest('base64')}`);
      console.log(`   Expected (Account 3): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET_3).update(body).digest('base64')}`);
      console.log(`   Received: ${signature}`);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
    
    let accessToken = credentials.token;
    const accountNumber = getAccountNumber(channelId);
    
    console.log(`   🔑 Using access token from credentials (Account ${accountNumber})`);
    
    const events = req.body.events || [];
    
    console.log(`📨 Webhook handler started`);
    console.log(`   Events count: ${events.length}`);
    console.log(`   Account: ${accountNumber}`);
    
    for (const event of events) {
      // Handle image messages (slip verification)
      if (event.type === 'message' && event.message.type === 'image') {
        console.log(`📸 Image message received`);
        console.log(`   Message ID: ${event.message.id}`);
        console.log(`   User ID: ${event.source.userId}`);
        
        try {
          // Download image from LINE
          console.log(`🌐 Downloading image from LINE...`);
          const imageBuffer = await downloadLineImage(event.message.id, accessToken);
          console.log(`   ✅ Downloaded (${imageBuffer.length} bytes)`);

          // Verify slip with Slip2Go API
          console.log(`🔍 Verifying slip with Slip2Go API...`);
          const Slip2GoImageVerificationService = require('./services/betting/slip2GoImageVerificationService');
          const verificationService = new Slip2GoImageVerificationService(process.env.SLIP2GO_SECRET_KEY, process.env.SLIP2GO_API_URL);
          
          const checkCondition = {
            checkDuplicate: process.env.SLIP_CHECK_DUPLICATE === 'true',
            checkReceiver: process.env.SLIP_CHECK_RECEIVER === 'true' ? [
              {
                accountType: '01004',
                accountNumber: accountNumber
              }
            ] : []
          };

          const verificationResult = await verificationService.verifySlipFromImage(imageBuffer, checkCondition);
          console.log(`   ✅ Verification result:`, verificationResult);

          // Get LINE user profile
          console.log(`👤 Getting LINE user profile...`);
          let lineUserName = 'Unknown';
          try {
            lineUserName = await getLineUserProfile(event.source.userId, accessToken);
            console.log(`   ✅ User name: ${lineUserName}`);
          } catch (profileError) {
            console.error(`   ⚠️  Failed to get user profile: ${profileError.message}`);
          }

          // Create reply message
          const replyMessage = verificationService.createLineMessage(verificationResult);
          console.log(`   📝 Reply message created`);

          // Send reply to user FIRST (before recording)
          console.log(`   📤 Sending reply to user...`);
          try {
            await sendLineMessageToUser(event.source.userId, replyMessage, accessToken);
            console.log(`   ✅ Reply sent`);
          } catch (replyError) {
            console.error(`   ⚠️  Failed to send reply: ${replyError.message}`);
          }

          // Record to Google Sheets if verified
          if (verificationService.isVerified(verificationResult)) {
            const slipData = verificationService.extractSlipData(verificationResult);
            console.log(`\n💾 Recording slip data:`, slipData);
            
            try {
              // ดึงยอดเงินก่อนหน้าก่อน (ก่อนบันทึก)
              console.log(`📝 Getting current balance before recording...`);
              const currentBalance = await getPlayerBalance(event.source.userId, lineUserName);
              console.log(`   Current balance: ${currentBalance} บาท`);

              // Record to Transactions sheet FIRST (ก่อนอัปเดต Players)
              console.log(`📝 Recording to Transactions sheet...`);
              await _recordTransactionToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                event.source.userId,
                lineUserName,
                accessToken,
                slipData,
                currentBalance
              );

              // Record to Players sheet AFTER (หลังบันทึก Transactions)
              console.log(`📝 Recording to Players sheet...`);
              await _recordPlayerToSheetFromSlip(
                googleAuth,
                GOOGLE_SHEET_ID,
                event.source.userId,
                lineUserName,
                accessToken,
                verificationResult.data.amount
              );

              console.log(`   ✅ Recorded to Google Sheets`);
            } catch (recordError) {
              console.error(`   ⚠️  Failed to record to Google Sheets: ${recordError.message}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing image: ${error.message}`);
          console.error(error.stack);
          
          // Send error message to user
          const errorMessage = `❌ เกิดข้อผิดพลาดในการตรวจสอบสลิป\n\n` +
            `เหตุผล: ${error.message}\n\n` +
            `📸 กรุณาส่งสลิปใหม่`;
          
          try {
            await sendLineMessageToUser(event.source.userId, errorMessage, accessToken);
          } catch (sendError) {
            console.error(`❌ Failed to send error message: ${sendError.message}`);
          }
        }
        continue;
      }
      
      if (event.type === 'message' && event.message.type === 'text') {
        // Handle text messages
        if (event.source.type !== 'group' && event.source.type !== 'user') {
          continue;
        }
        
        const message = {
          replyToken: event.replyToken,
          userId: event.source.userId,
          messageId: event.message.id,
          quotedMessageId: event.message.quotedMessageId || null,
          content: event.message.text,
          timestamp: event.timestamp,
          groupId: event.source.groupId || event.source.userId,
          sourceType: event.source.type
        };
        
        console.log(`📨 Processing message`);
        console.log(`   From: ${message.userId}`);
        console.log(`   Text: "${message.content}"`);
        console.log(`   MessageID: ${message.messageId}`);
        if (message.quotedMessageId) {
          console.log(`   Replying to: ${message.quotedMessageId}`);
        }
        
        // Register group if it's a group message
        if (message.sourceType === 'group') {
          const groupName = await getLineGroupName(message.groupId, accessToken);
          registerGroup(message.groupId, groupName, accountNumber);
        }
        
        // Check if this is a command
        if (message.content.toLowerCase().includes('สรุปยอดแทง')) {
          console.log(`📋 Summary command detected`);
          const summary = await generateBettingSummary(message.groupId, message.sourceType, accountNumber);
          await sendLineMessage(message.groupId, summary, accessToken);
          console.log(`✅ Summary sent`);
        } else {
          // Check if this is a result announcement
          const resultData = parseResultMessage(message.content);
          
          if (resultData) {
              console.log(`📊 Result announcement detected`);
              console.log(`   Firework: ${resultData.fireworkName}`);
              console.log(`   Number: ${resultData.resultNumber}`);
              console.log(`   Result: ${resultData.result}`);
              
              // ใช้ AutoMatchingService
              const AutoMatchingService = require('./services/betting/autoMatchingService');
              const matchingService = new AutoMatchingService(googleAuth, GOOGLE_SHEET_ID, GOOGLE_WORKSHEET_NAME);
              
              // ดึงข้อมูลยอดเงินของผู้เล่น
              const playerBalances = await getPlayerBalances();
              
              // จับคู่เล่นอัตโนมัติ
              const matchedPairs = await matchingService.autoMatchPlayers(resultData.fireworkName, playerBalances);
              console.log(`   ✅ จับคู่สำเร็จ ${matchedPairs.length} คู่`);
              
              // คำนวนแพ้ชนะและส่งข้อความให้ผู้เล่น
              for (const pair of matchedPairs) {
                try {
                  // คำนวนแพ้ชนะ
                  const winLoss = matchingService.calculateWinLoss(pair, resultData.result);
                  
                  // อัปเดตผลลัพธ์
                  await matchingService.updateResultAndBalance(pair, winLoss);
                  
                  // สร้างข้อความแจ้งผล
                  const resultMessages = matchingService.createResultMessage(pair, winLoss);
                  
                  // ส่งข้อความให้ผู้เล่น A
                  console.log(`   📤 ส่งข้อความให้ ${pair.playerA.userAName}`);
                  await sendLineMessageToUser(pair.playerA.userA, resultMessages.messageA, accessToken);
                  
                  // ส่งข้อความให้ผู้เล่น B
                  console.log(`   📤 ส่งข้อความให้ ${pair.playerB.userAName}`);
                  await sendLineMessageToUser(pair.playerB.userA, resultMessages.messageB, accessToken);
                  
                  console.log(`   ✅ ส่งข้อความสำเร็จ`);
                } catch (pairError) {
                  console.error(`   ❌ ข้อผิดพลาด: ${pairError.message}`);
                }
              }
              
              // Find matching bets (legacy)
              const matchingBets = await findMatchingBets(resultData.fireworkName, resultData.resultNumber);
              console.log(`   Found ${matchingBets.length} matching bet(s)`);
              
              // Update each matching bet
              for (const bet of matchingBets) {
                await updateBetResult(bet.rowIndex, resultData.resultNumber, resultData.result, accessToken);
              }
              
              if (matchingBets.length > 0) {
                console.log(`✅ Results updated successfully`);
              }
            } else {
              // ตรวจสอบว่าเป็นข้อความแทงหรือไม่
              const betAmount = extractBetAmount(message.content);
              
              if (betAmount > 0) {
                // นี่คือข้อความแทง ตรวจสอบยอดเงินทันที
                console.log(`💰 Betting message detected: ${betAmount} บาท`);
                
                // ดึงชื่อผู้เล่น
                const userName = await getLineUserProfile(message.userId, accessToken);
                console.log(`   Player: ${userName}`);
                
                // ตรวจสอบยอดเงินของผู้เล่น
                const playerBalance = await getPlayerBalance(message.userId, userName);
                console.log(`   Current balance: ${playerBalance} บาท`);
                console.log(`   Bet amount: ${betAmount} บาท`);
                
                // ถ้ายอดเงินไม่พอ ให้แจ้งเลย
                if (playerBalance < betAmount) {
                  console.log(`❌ Insufficient balance for ${userName}`);
                  
                  // ส่งข้อความส่วนตัวให้ผู้เล่นเท่านั้น
                  const personalMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                    `ชื่อ: ${userName}\n` +
                    `ข้อความแทง: "${message.content}"\n` +
                    `ยอดเงินปัจจุบัน: ${playerBalance} บาท\n` +
                    `ต้องการ: ${betAmount} บาท\n` +
                    `ขาดอีก: ${(betAmount - playerBalance).toFixed(0)} บาท\n\n` +
                    `💳 ช่องทางเติมเงิน:\n` +
                    `• เพิ่มเพื่อน @774pojob\n` +
                    `• https://lin.ee/JO6X7FE\n\n` +
                    `📞 ติดต่อสอบถาม: @774pojob`;
                  
                  await sendLineMessageToUser(message.userId, personalMessage, accessToken);
                  console.log(`   📤 Personal message sent to ${userName}`);
                } else {
                  console.log(`✅ Balance sufficient for ${userName}`);
                  
                  // 🎯 AUTO MATCHING: ตรวจชื่อบั้งไฟต้องตรงกัน ใช้ยอดเงินน้อยกว่าเป็นหลัก
                  const betAmount = extractBetAmount(message.content);
                  const fireworkName = extractFireworkName(message.content);
                  const betType = extractBetType(message.content);
                  
                  if (betAmount > 0 && fireworkName && betType) {
                    console.log(`🔍 Looking for matching players for firework: ${fireworkName}`);
                    
                    // ดึงข้อมูลการเดิมพันทั้งหมดจาก Google Sheets
                    try {
                      const response = await sheets.spreadsheets.values.get({
                        auth: googleAuth,
                        spreadsheetId: GOOGLE_SHEET_ID,
                        range: `${GOOGLE_WORKSHEET_NAME}!A:O`,
                      });
                      
                      const rows = response.data.values || [];
                      const matchingBets = [];
                      
                      // ค้นหาการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
                      for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row) continue;
                        
                        const rowFireworkName = row[4] || ''; // Column E
                        const rowResultA = row[9] || ''; // Column J
                        const rowResultB = row[10] || ''; // Column K
                        const rowUserA = row[1] || ''; // Column B
                        const rowUserB = row[11] || ''; // Column L
                        const rowBetTypeA = row[5] || ''; // Column F
                        
                        // ตรวจสอบว่าเป็นการเดิมพันที่ยังไม่มีผลลัพธ์ และเล่นบั้งไฟเดียวกัน
                        // ✅ ต้องตรวจชื่อบั้งไฟให้ตรงกันทั้งหมด
                        if (!rowResultA && !rowResultB && 
                            rowFireworkName === fireworkName &&
                            rowUserA !== message.userId && rowUserB !== message.userId) {
                          
                          // ตรวจสอบว่าประเภทเดิมพันตรงข้ามกันหรือไม่
                          const isOpposite = (typeA, typeB) => {
                            const opposites = {
                              '✅': '❌',
                              '❌': '✅',
                              'ต่ำ/ยั่ง': 'สูง/ไล่',
                              'สูง/ไล่': 'ต่ำ/ยั่ง',
                              'ถอย': 'ยั้ง',
                              'ยั้ง': 'ถอย',
                              'ล่าง': 'บน',
                              'บน': 'ล่าง'
                            };
                            return opposites[typeA] === typeB;
                          };
                          
                          if (isOpposite(rowBetTypeA, betType)) {
                            matchingBets.push({
                              rowIndex: i + 1,
                              userA: rowUserA,
                              userB: rowUserB,
                              amountA: parseFloat(row[6]) || 0,
                              amountB: parseFloat(row[7]) || 0,
                              betTypeA: rowBetTypeA
                            });
                          }
                        }
                      }
                      
                      if (matchingBets.length > 0) {
                        console.log(`✅ Found ${matchingBets.length} matching bet(s)`);
                        
                        // จับคู่กับการเดิมพันแรกที่พบ
                        const matchedBet = matchingBets[0];
                        const matchedUserBalance = await getPlayerBalance(matchedBet.userA, '');
                        
                        // ✅ ยึดจากคนยอดน้อยกว่า
                        const finalBetAmount = Math.min(betAmount, matchedBet.amountA, matchedUserBalance, playerBalance);
                        
                        console.log(`🎯 Auto-matching with user: ${matchedBet.userA}`);
                        console.log(`   Final bet amount: ${finalBetAmount} บาท (using minimum)`);
                        
                        // บันทึกการเดิมพันใหม่ (ผู้เล่นที่จับคู่ vs ผู้เล่นปัจจุบัน)
                        const groupName = await getLineGroupName(message.groupId, accessToken);
                        const matchedUserName = await getLineUserProfile(matchedBet.userA, accessToken);
                        
                        const pair = {
                          userA: matchedBet.userA,
                          messageA: `${fireworkName} ${matchedBet.betTypeA} ${matchedBet.amountA}`,
                          timestampA: Date.now(),
                          userB: message.userId,
                          messageB: message.content,
                          timestampB: message.timestamp,
                          groupId: message.groupId
                        };
                        
                  try {
                    await appendToGoogleSheets(pair, matchedUserName, userName, groupName, 'auto');
                    console.log(`✅ Auto-matched pair recorded successfully`);
                  } catch (recordError) {
                    console.error(`❌ Failed to record pair: ${recordError.message}`);
                  }
                      } else {
                        console.log(`⏭️  No matching bets found, recording initial bet for future matching...`);
                        
                        // 📝 บันทึกการเดิมพันแรกลงชีทเพื่อรอการจับคู่ในอนาคต
                        try {
                          const groupName = await getLineGroupName(message.groupId, accessToken);
                          
                          // สร้าง pair ชั่วคราวสำหรับบันทึก (User A เป็นผู้เดิมพันแรก)
                          const tempPair = {
                            userA: message.userId,
                            messageA: message.content,
                            timestampA: message.timestamp,
                            userB: '', // ยังไม่มี User B
                            messageB: '',
                            timestampB: message.timestamp,
                            groupId: message.groupId
                          };
                          
                          // บันทึกการเดิมพันแรก (ยังไม่มี User B)
                          await recordInitialBet(tempPair, userName, groupName);
                          console.log(`✅ Initial bet recorded, waiting for matching player...`);
                        } catch (recordError) {
                          console.error(`❌ Failed to record initial bet: ${recordError.message}`);
                        }
                      }
                    } catch (matchError) {
                      console.error(`⚠️  Error finding matching bets: ${matchError.message}`);
                    }
                  }
                }
              }
              
              // Detect pair
              const pair = detectPair(message);
              
              if (pair) {
                console.log(`   messageA: "${pair.messageA}"`);
                console.log(`   messageB: "${pair.messageB}"`);
                
                // Extract bet details
                const betDetailsA = {
                  fireworkName: extractFireworkName(pair.messageA),
                  betType: extractBetType(pair.messageA),
                  betAmount: extractBetAmount(pair.messageA)
                };
                
                const betDetailsB = {
                  fireworkName: extractFireworkName(pair.messageB),
                  betType: extractBetType(pair.messageB),
                  betAmount: extractBetAmount(pair.messageB)
                };
                
                console.log(`   🎯 Bet Details A: firework=${betDetailsA.fireworkName}, type=${betDetailsA.betType}, amount=${betDetailsA.betAmount}`);
                console.log(`   🎯 Bet Details B: firework=${betDetailsB.fireworkName}, type=${betDetailsB.betType}, amount=${betDetailsB.betAmount}`);
                
                // ตรวจสอบว่า User A มีประเภทเดิมพันหรือไม่
                if (!betDetailsA.betType) {
                  console.log(`❌ Missing bet type in User A message`);
                  return;
                }
                
                // ตรวจสอบว่าประเภทตรงข้ามกัน (✅ vs ❌ หรือ ต่ำ vs สูง)
                const isOpposite = (typeA, typeB) => {
                  const opposites = {
                    '✅': '❌',
                    '❌': '✅',
                    'ต่ำ/ยั่ง': 'สูง/ไล่',
                    'สูง/ไล่': 'ต่ำ/ยั่ง',
                    'ถอย': 'ยั้ง',
                    'ยั้ง': 'ถอย',
                    'ล่าง': 'บน',
                    'บน': 'ล่าง',
                    'ชล': 'ชล'
                  };
                  return opposites[typeA] === typeB;
                };
                
                // 🎯 REPLY MATCHING: ถ้า User B ไม่ระบุประเภท ให้ถือว่า User B เล่นฝั่งตรงข้าม
                let userBBetType = betDetailsB.betType;
                if (!userBBetType) {
                  // ถ้า User B ไม่ระบุประเภท ให้ใช้ประเภทตรงข้ามกับ User A
                  const opposites = {
                    '✅': '❌',
                    '❌': '✅',
                    'ต่ำ/ยั่ง': 'สูง/ไล่',
                    'สูง/ไล่': 'ต่ำ/ยั่ง',
                    'ถอย': 'ยั้ง',
                    'ยั้ง': 'ถอย',
                    'ล่าง': 'บน',
                    'บน': 'ล่าง',
                    'ชล': 'ชล'
                  };
                  userBBetType = opposites[betDetailsA.betType];
                  console.log(`   ℹ️  User B didn't specify bet type, assuming opposite: ${userBBetType}`);
                }
                
                // ตรวจสอบว่าประเภทตรงข้ามกันหรือไม่
                if (!isOpposite(betDetailsA.betType, userBBetType)) {
                  console.log(`❌ Bet types are not opposite: "${betDetailsA.betType}" vs "${userBBetType}"`);
                  return;
                }
                
                console.log(`✅ Bet types are opposite: "${betDetailsA.betType}" vs "${userBBetType}"`);
                
                // 🎯 REPLY MATCHING: ยึด User A เป็นหลัก ไม่ต้องตรวจชื่อบั้งไฟ
                // ใช้ยอดเงินของ User A เป็นหลัก
                const betAmount = betDetailsA.betAmount || 0;
                
                // Fetch user names first
                console.log('👤 Fetching user profiles and group name...');
                const userAName = await getLineUserProfile(pair.userA, accessToken);
                const userBName = await getLineUserProfile(pair.userB, accessToken);
                const groupName = await getLineGroupName(pair.groupId, accessToken);
                
                console.log(`   User A: ${userAName}`);
                console.log(`   User B: ${userBName}`);
                console.log(`   Group: ${groupName}`);
                console.log(`   📱 Using LINE Account: ${accountNumber === 1 ? 'Primary' : 'Secondary'}`);
                
                // Get player balances
                const userABalance = await getPlayerBalance(pair.userA, userAName);
                const userBBalance = await getPlayerBalance(pair.userB, userBName);
                
                console.log(`   💰 User A Balance: ${userABalance} บาท`);
                console.log(`   💰 User B Balance: ${userBBalance} บาท`);
                console.log(`   💰 Bet Amount (from User A): ${betAmount} บาท`);
                
                // Check if both players have sufficient balance
                if (userABalance < betAmount || userBBalance < betAmount) {
                  console.log(`❌ Insufficient balance detected`);
                  
                  // Send detailed message to User A if balance is insufficient
                  if (userABalance < betAmount) {
                    const userADetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                      `ชื่อ: ${userAName}\n` +
                      `ข้อความ: ${pair.messageA}\n` +
                      `ยอดเงินปัจจุบัน: ${userABalance} บาท\n` +
                      `ต้องการ: ${betAmount} บาท\n` +
                      `ขาดอีก: ${(betAmount - userABalance).toFixed(0)} บาท\n\n` +
                      `💳 ช่องทางเติมเงิน:\n` +
                      `• เพิ่มเพื่อน @774pojob\n` +
                      `• https://lin.ee/JO6X7FE`;
                    console.log(`   📤 Sending insufficient balance message to ${userAName}`);
                    await sendLineMessageToUser(pair.userA, userADetailMessage, accessToken);
                  }
                  
                  // Send detailed message to User B if balance is insufficient
                  if (userBBalance < betAmount) {
                    const userBDetailMessage = `❌ ยอดเงินไม่เพียงพอ\n\n` +
                      `ชื่อ: ${userBName}\n` +
                      `ข้อความ: ${pair.messageB}\n` +
                      `ยอดเงินปัจจุบัน: ${userBBalance} บาท\n` +
                      `ต้องการ: ${betAmount} บาท\n` +
                      `ขาดอีก: ${(betAmount - userBBalance).toFixed(0)} บาท\n\n` +
                      `💳 ช่องทางเติมเงิน:\n` +
                      `• เพิ่มเพื่อน @774pojob\n` +
                      `• https://lin.ee/JO6X7FE`;
                    console.log(`   📤 Sending insufficient balance message to ${userBName}`);
                    await sendLineMessageToUser(pair.userB, userBDetailMessage, accessToken);
                  }
                } else {
                  // ยอดเงินเพียงพอ บันทึกการเดิมพัน
                  console.log(`✅ Balance sufficient for both players`);
                  console.log(`   📝 Recording bet to Bets sheet...`);
                  
                  try {
                    await appendToGoogleSheets(pair, userAName, userBName, groupName, 'reply');
                    console.log(`✅ Pair recorded successfully`);
                  } catch (recordError) {
                    console.error(`❌ Failed to record pair: ${recordError.message}`);
                  }
                }
              } else {
                console.log(`⏭️  No pair detected (waiting for reply)`);
              }
            }
          }
        } else if (event.type === 'join') {
        // Handle join event (bot joined a new group)
        console.log(`\n✅ Bot joined a new group`);
        
        const groupId = event.source.groupId;
        const timestamp = event.timestamp;
        
        console.log(`   Group ID: ${groupId}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Account: ${accountNumber}`);
        
        try {
          // Get group name
          const groupName = await getLineGroupName(groupId, accessToken);
          console.log(`   Group Name: ${groupName}`);
          
          // Register group
          registerGroup(groupId, groupName, accountNumber);
          console.log(`   ✅ Group registered successfully`);
          
          // Send welcome message
          const welcomeMessage = `👋 สวัสดีค่ะ ฉันเป็น LINE Betting Bot\n\n` +
            `📝 วิธีใช้:\n` +
            `1. ส่งข้อความแทง (เช่น "ชล 100")\n` +
            `2. ตอบกลับข้อความของคนอื่น เพื่อสร้างคู่แทง\n` +
            `3. ส่ง "สรุปยอดแทง" เพื่อดูสรุปยอด\n\n` +
            `✅ ระบบพร้อมบันทึกข้อมูลแทงของกลุ่ม: ${groupName}`;
          
          await sendLineMessage(groupId, welcomeMessage, accessToken);
          console.log(`✅ Welcome message sent to new group`);
        } catch (error) {
          console.error(`❌ Error handling join event:`, error.message);
        }
      } else if (event.type === 'leave') {
        // Handle leave event (bot left a group)
        console.log(`\n👋 Bot left a group`);
        
        const groupId = event.source.groupId;
        console.log(`   Group ID: ${groupId}`);
        console.log(`   ℹ️  Bot will no longer receive messages from this group`);
      } else if (event.type === 'unsend') {
        // Handle unsend (message deletion)
        console.log(`\n❌ Message unsend detected`);
        
        const unsendEvent = event;
        const userId = event.source.userId;
        const messageId = event.unsend.messageId;
        const timestamp = event.timestamp;
        
        console.log(`   Message ID: ${messageId}`);
        console.log(`   User ID: ${userId}`);
        
        // Get user name
        const userName = await getLineUserProfile(userId, accessToken);
        
        // Get group name
        const groupId = event.source.groupId || event.source.userId;
        const groupName = await getLineGroupName(groupId, accessToken);
        
        // Calculate time difference
        const now = new Date();
        const unsendTime = new Date(timestamp);
        const diffSeconds = Math.floor((now - unsendTime) / 1000);
        
        let timeAgo = '';
        if (diffSeconds < 60) {
          timeAgo = `${diffSeconds} วินาทีที่แล้ว`;
        } else if (diffSeconds < 3600) {
          timeAgo = `${Math.floor(diffSeconds / 60)} นาทีที่แล้ว`;
        } else {
          timeAgo = `${Math.floor(diffSeconds / 3600)} ชั่วโมงที่แล้ว`;
        }
        
        const unsendTime24h = unsendTime.toLocaleString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Create unsend report
        const unsendReport = `❌ [ พบการยกเลิกข้อความ ]\n` +
          `❌\n` +
          `• ผู้ยกเลิก: ${userName}\n` +
          `• ยกเลิกเมื่อ: ${timeAgo}\n` +
          `• เวลา: ${unsendTime24h} ที่ยกเลิก\n` +
          `• Message ID: ${messageId}\n` +
          `• Group: ${groupName}`;
        
        console.log(`📤 Sending unsend report...`);
        console.log(unsendReport);
        
        // Send report to group
        await sendLineMessage(groupId, unsendReport, accessToken);
        console.log(`✅ Unsend report sent`);
      }
    }
    
    console.log('✅ Webhook handler completed\n');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== INITIALIZE SHEETS =====
async function initializeSheets() {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('🔧 Initializing Google Sheets...');
    
    // Verify access
    await sheets.spreadsheets.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
    });
    
    console.log('✅ Google Sheets access verified');
    
    // Create headers
    const headers = [
      'Timestamp',
      'User A ID',
      'ชื่อ User A',
      'ข้อความ A',
      'ชื่อบั้งไฟ',
      'รายการเล่น',
      'ยอดเงิน',
      'ยอดเงิน B',
      'ผลที่ออก',
      'ผลแพ้ชนะ',
      'User B ID',
      'ชื่อ User B',
      'รายการแทง',
      'ชื่อกลุ่มแชท',
    ];
    
    console.log('📝 Creating headers...');
    
    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${GOOGLE_WORKSHEET_NAME}!A1:N1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });
    
    console.log('✅ Headers created');
  } catch (error) {
    console.warn('⚠️  Warning: Could not initialize sheets:', error.message);
  }
}

// ===== HELPER FUNCTIONS FOR SLIP RECORDING =====

async function _recordPlayerToSheetFromSlip(googleAuth, googleSheetId, userId, lineUserName, accessToken, amount) {
  try {
    console.log(`📝 _recordPlayerToSheetFromSlip called:`);
    console.log(`   userId: ${userId}`);
    console.log(`   lineUserName: ${lineUserName}`);
    console.log(`   amount: ${amount}`);
    
    const sheets = google.sheets('v4');

    // ใช้ชื่อที่ส่งเข้ามา ถ้าไม่ใช่ "Unknown" ให้ดึงจาก LINE Profile API
    let actualUserName = lineUserName;
    if (!actualUserName || actualUserName === 'Unknown') {
      try {
        console.log(`   🔄 ชื่อเป็น Unknown ดึงจาก LINE Profile API...`);
        actualUserName = await getLineUserProfile(userId, accessToken);
        console.log(`   📝 ดึงชื่อจาก LINE Profile: ${actualUserName}`);
      } catch (error) {
        console.warn(`   ⚠️  ไม่สามารถดึงชื่อจาก LINE Profile: ${error.message}`);
        actualUserName = lineUserName || 'Unknown';
      }
    }

    // ตรวจสอบว่าผู้เล่นมีอยู่แล้วหรือไม่
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Players!A:K`,
    });

    const rows = response.data.values || [];
    let playerRowIndex = null;
    let currentBalance = 0;
    let totalDeposits = 0;
    let linkedUserIds = [];

    // หาแถวของผู้เล่น - ค้นหาจากชื่อ LINE ก่อน (primary)
    console.log(`   🔍 Searching by LINE name: "${actualUserName}"`);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][1] === actualUserName) {
        // เก็บ User ID ทั้งหมดของชื่อ LINE นี้
        const existingId = rows[i][0];
        if (existingId && !linkedUserIds.includes(existingId)) {
          linkedUserIds.push(existingId);
        }
        
        // ใช้แถวแรกที่พบเป็นแถวหลัก
        if (!playerRowIndex) {
          playerRowIndex = i + 1;
          currentBalance = parseFloat(rows[i][4]) || 0;
          totalDeposits = parseFloat(rows[i][5]) || 0;
          console.log(`   ✅ Found player by name at row ${playerRowIndex}: balance=${currentBalance}, deposits=${totalDeposits}`);
        }
      }
    }

    // ถ้าไม่พบจากชื่อ ให้ค้นหาจาก User ID (backup)
    if (!playerRowIndex) {
      console.log(`   ℹ️  Not found by name, searching by User ID: "${userId}"`);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][0] === userId) {
          playerRowIndex = i + 1;
          currentBalance = parseFloat(rows[i][4]) || 0;
          totalDeposits = parseFloat(rows[i][5]) || 0;
          linkedUserIds.push(userId);
          console.log(`   ✅ Found player by ID at row ${playerRowIndex}: balance=${currentBalance}, deposits=${totalDeposits}`);
          break;
        }
      }
    }

    // เพิ่ม User ID ปัจจุบันถ้ายังไม่มี
    if (!linkedUserIds.includes(userId)) {
      linkedUserIds.push(userId);
    }

    console.log(`   🔗 Linked User IDs: ${linkedUserIds.join(', ')}`);

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const newBalance = currentBalance + amount;
    const newTotalDeposits = totalDeposits + amount;

    if (playerRowIndex) {
      // อัปเดตผู้เล่นที่มีอยู่แล้ว
      console.log(`   📝 อัปเดตผู้เล่น: ${actualUserName} (row ${playerRowIndex})`);

      const updateResponse = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
      });

      const currentRow = updateResponse.data.values ? updateResponse.data.values[0] : [];

      // เก็บ User ID ทั้งหมดในคอลัมน์ C (Phone) เป็น JSON
      const linkedIdsJson = JSON.stringify(linkedUserIds);

      const newRow = [
        userId, // ใช้ User ID ปัจจุบัน
        actualUserName,
        linkedIdsJson, // เก็บ User ID ทั้งหมดในรูป JSON
        currentRow[3] || '',
        newBalance,
        newTotalDeposits,
        currentRow[6] || 0,
        'active',
        currentRow[8] || dateStr,
        dateStr,
        accessToken,
      ];

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${playerRowIndex}:K${playerRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ อัปเดตสำเร็จ: ${newBalance} บาท (ชื่อ: ${actualUserName})`);
    } else {
      // สร้างผู้เล่นใหม่
      console.log(`   📝 สร้างผู้เล่นใหม่: ${actualUserName}`);

      // เก็บ User ID ทั้งหมดในคอลัมน์ C (Phone) เป็น JSON
      const linkedIdsJson = JSON.stringify(linkedUserIds);

      const newRow = [
        userId,
        actualUserName,
        linkedIdsJson, // เก็บ User ID ทั้งหมดในรูป JSON
        '',
        amount,
        amount,
        0,
        'active',
        dateStr,
        dateStr,
        accessToken,
      ];

      const nextRowIndex = rows.length + 1;

      await sheets.spreadsheets.values.update({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A${nextRowIndex}:K${nextRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      console.log(`   ✅ สร้างสำเร็จ: ${amount} บาท (ชื่อ: ${actualUserName})`);
    }

    return {
      success: true,
      newBalance: newBalance,
    };
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

async function _recordTransactionToSheetFromSlip(googleAuth, googleSheetId, userId, lineUserName, accessToken, slipData, balanceBefore = 0) {
  try {
    const sheets = google.sheets('v4');

    // ดึงจำนวนแถวปัจจุบัน
    const transResponse = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A:A`,
    });

    const transRows = transResponse.data.values || [];
    const nextRowIndex = transRows.length + 1;

    const now = new Date();
    const dateStr = now.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const timeStr = now.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // ถ้าไม่ได้ส่ง balanceBefore มา ให้ดึงจาก Players sheet
    if (balanceBefore === 0) {
      console.log(`   📊 Fetching balance from Players sheet...`);
      const playerData = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId,
        range: `Players!A:K`,
      });

      const playerDataRows = playerData.data.values || [];
      for (let i = 1; i < playerDataRows.length; i++) {
        if (playerDataRows[i] && playerDataRows[i][0] === userId) {
          balanceBefore = parseFloat(playerDataRows[i][4]) || 0;
          console.log(`   Found balance: ${balanceBefore}`);
          break;
        }
      }
    }

    const balanceAfter = balanceBefore + slipData.amount;

    console.log(`   💰 Balance Before: ${balanceBefore}`);
    console.log(`   💰 Amount: ${slipData.amount}`);
    console.log(`   💰 Balance After: ${balanceAfter}`);

    const transactionRow = [
      dateStr,
      lineUserName,
      'deposit',
      slipData.amount,
      slipData.referenceId || '',
      '',
      'verified',
      `Slip verified from LINE OA - Ref: ${slipData.referenceId}`,
      balanceBefore,
      balanceAfter,
      `${dateStr} ${timeStr}`,
      accessToken,
    ];

    await sheets.spreadsheets.values.update({
      auth: googleAuth,
      spreadsheetId: googleSheetId,
      range: `Transactions!A${nextRowIndex}:L${nextRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [transactionRow],
      },
    });

    console.log(`   ✅ บันทึกรายการเงินสำเร็จ`);
  } catch (error) {
    console.error(`   ❌ ข้อผิดพลาด: ${error.message}`);
    throw error;
  }
}

// Get player balance
async function getPlayerBalance(userId, userName) {
  if (!googleAuth) {
    console.warn(`⚠️  googleAuth not initialized`);
    return 0;
  }
  
  try {
    console.log(`\n📊 === Getting Player Balance ===`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Name: ${userName}`);
    
    // ลองดึงข้อมูลหลายครั้งเพื่อรอให้ Google Sheets อัปเดตเสร็จ
    let retries = 3;
    let balance = 0;
    let found = false;
    
    while (retries > 0 && !found) {
      // ดึงข้อมูลจาก Players sheet
      const response = await sheets.spreadsheets.values.get({
        auth: googleAuth,
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `Players!A:K`,
      });
      
      const rows = response.data.values || [];
      console.log(`   📊 Total rows in Players sheet: ${rows.length} (attempt ${4 - retries})`);
      
      // แสดงข้อมูลทั้งหมด (สำหรับ debug)
      if (rows.length > 1) {
        console.log(`   📋 Players data:`);
        for (let i = 1; i < Math.min(rows.length, 10); i++) {
          if (rows[i]) {
            console.log(`      Row ${i + 1}: Name=${rows[i][1]}, LinkedIDs=${rows[i][2]}, Balance=${rows[i][4]}`);
          }
        }
      }
      
      // ค้นหาผู้เล่นจาก ชื่อ LINE เป็นหลัก
      console.log(`   🔍 Searching by LINE name: "${userName}"`);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][1] === userName) {
          balance = parseFloat(rows[i][4]) || 0;
          console.log(`   ✅ Found player by LINE name at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
          found = true;
          break;
        }
      }
      
      // ถ้าไม่พบจากชื่อ ให้ลองค้นหาจาก User ID ในรายการ Linked IDs
      if (!found) {
        console.log(`   ℹ️  Not found by LINE name, searching in Linked IDs...`);
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][2]) {
            try {
              const linkedIds = JSON.parse(rows[i][2]);
              if (Array.isArray(linkedIds) && linkedIds.includes(userId)) {
                balance = parseFloat(rows[i][4]) || 0;
                console.log(`   ✅ Found player by Linked ID at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
                found = true;
                break;
              }
            } catch (e) {
              // ถ้า parse JSON ไม่ได้ ให้ข้ามไป
            }
          }
        }
      }
      
      // ถ้าไม่พบ ให้ลองค้นหาจาก User ID ตรง (backup)
      if (!found) {
        console.log(`   ℹ️  Not found in Linked IDs, trying by User ID directly...`);
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === userId) {
            balance = parseFloat(rows[i][4]) || 0;
            console.log(`   ✅ Found player by User ID at row ${i + 1}: ${rows[i][1]} (balance: ${balance} บาท)`);
            found = true;
            break;
          }
        }
      }
      
      // ถ้าไม่พบ ให้รอและลองใหม่
      if (!found && retries > 1) {
        console.log(`   ⏳ Player not found, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      } else {
        retries = 0;
      }
    }
    
    if (!found) {
      console.log(`   ⚠️  Player not found in sheet after retries (will return 0)`);
    }
    
    console.log(`   📊 === End Getting Player Balance ===\n`);
    return balance;
  } catch (error) {
    console.error('❌ Error getting player balance:', error.message);
    console.log(`   📊 === End Getting Player Balance (ERROR) ===\n`);
    return 0;
  }
}

// Get all player balances (ยึดชื่อ LINE เป็นหลัก)
async function getPlayerBalances() {
  if (!googleAuth) {
    console.warn(`⚠️  googleAuth not initialized`);
    return {};
  }
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: googleAuth,
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Players!A:K`,
    });
    
    const rows = response.data.values || [];
    const balances = {};
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]) {
        const userId = rows[i][0];
        const userName = rows[i][1] || 'Unknown';
        const balance = parseFloat(rows[i][4]) || 0;
        
        // ยึดชื่อ LINE เป็นหลัก
        if (userName && userName !== 'Unknown') {
          balances[userName] = balance;
          console.log(`   📊 Player: ${userName} - Balance: ${balance}`);
        }
        
        // เก็บ User ID เป็น backup
        if (userId) {
          balances[userId] = balance;
        }
      }
    }
    
    return balances;
  } catch (error) {
    console.error('❌ Error getting player balances:', error.message);
    return {};
  }
}

// ===== START SERVER =====
async function start() {
  try {
    await initializeSheets();
    
    // Register Slip Check API router
    const createSlipCheckApiRouter = require('./routes/slipCheckApi');
    const slipCheckApiRouter = createSlipCheckApiRouter(process.env.SLIP2GO_SECRET_KEY);
    app.use(upload.single('file'), slipCheckApiRouter);

    // Register Slip2Go webhook router
    const createSlip2GoWebhookRouter = require('./routes/slip2GoWebhook');
    const slip2GoRouter = createSlip2GoWebhookRouter(
      googleAuth,
      GOOGLE_SHEET_ID,
      LINE_CHANNEL_ACCESS_TOKEN_3,
      process.env.SLIP2GO_SECRET_KEY
    );
    app.use('/slip2go', slip2GoRouter);

    // Register Line Slip Verification router
    const createLineSlipVerificationRouter = require('./routes/lineSlipVerificationWebhook');
    const slipVerificationRouter = createLineSlipVerificationRouter(
      process.env.SLIP2GO_SECRET_KEY,
      process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
      process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET,
      googleAuth,
      GOOGLE_SHEET_ID
    );
    app.use('/', slipVerificationRouter);
    
    app.listen(PORT, () => {
      console.log(`\n🚀 LINE Betting Bot listening on port ${PORT}`);
      console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
      console.log(`📍 Slip Check API: http://localhost:${PORT}/api/slip/verify`);
      console.log(`📍 Slip2Go Webhook URL: http://localhost:${PORT}/slip2go/slip-verified`);
      console.log(`✅ Ready to receive messages\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
