require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
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

// Add raw body middleware for Slip2Go webhook
app.use((req, res, next) => {
  if (req.path === '/slip2go/slip-verified') {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
        req.rawBody = data;
        next();
      } catch (error) {
        console.error('❌ Failed to parse Slip2Go webhook body:', error.message);
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  } else {
    next();
  }
});

// ===== CONFIGURATION =====
// Primary Account
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;

// Secondary Account
const LINE_CHANNEL_SECRET_2 = process.env.LINE_CHANNEL_SECRET_2;
const LINE_CHANNEL_ACCESS_TOKEN_2 = process.env.LINE_CHANNEL_ACCESS_TOKEN_2;
const LINE_CHANNEL_ID_2 = process.env.LINE_CHANNEL_ID_2;

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
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/profile/${userId}`,
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
          const profile = JSON.parse(data);
          console.log(`      👤 Profile response:`, profile);
          resolve(profile.displayName || 'Unknown');
        } catch (e) {
          console.log(`      ❌ Parse error:`, e.message);
          resolve('Unknown');
        }
      });
    }).on('error', (err) => {
      console.log(`      ❌ API error:`, err.message);
      resolve('Unknown');
    }).end();
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
async function updateBetResult(rowIndex, resultNumber, resultSymbol) {
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
  } catch (error) {
    console.error('❌ Failed to update result:', error.message);
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
  
  // Get all numbers
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
  const betTypes = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ชล': 'ชล',
    'ชถ': 'ชล',
    'สกัด': 'สกัด',
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
  // Look for numbers with separators
  const withSeparator = message.match(/\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*/);
  if (withSeparator) {
    console.log(`      ✅ Firework name: ${withSeparator[0]}`);
    return withSeparator[0];
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
async function appendToGoogleSheets(pair, userAName, userBName, groupName) {
  if (!googleAuth) {
    console.log('⚠️  Google Sheets not initialized');
    return;
  }
  
  try {
    console.log('📤 Recording to Google Sheets...');
    
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
    
    // Use largest amount
    const betAmount = Math.max(betDetailsA.betAmount || 0, betDetailsB.betAmount || 0);
    
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
  } catch (error) {
    console.error('❌ Failed to append to Google Sheets:', error.message);
  }
}

// ===== ROUTES =====

app.get('/health', (req, res) => {
  console.log('✅ Health check');
  res.status(200).json({ status: 'ok' });
});

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
    
    // Try primary account first
    if (validateLineSignature(signature, body, LINE_CHANNEL_SECRET)) {
      credentials = { secret: LINE_CHANNEL_SECRET, token: LINE_CHANNEL_ACCESS_TOKEN };
      channelId = LINE_CHANNEL_ID;
      console.log(`   ✅ Validated with Primary Account`);
    } 
    // Try secondary account
    else if (LINE_CHANNEL_SECRET_2 && validateLineSignature(signature, body, LINE_CHANNEL_SECRET_2)) {
      credentials = { secret: LINE_CHANNEL_SECRET_2, token: LINE_CHANNEL_ACCESS_TOKEN_2 };
      channelId = LINE_CHANNEL_ID_2;
      console.log(`   ✅ Validated with Secondary Account`);
    }
    // Invalid signature
    else {
      console.log('❌ Invalid signature');
      console.log(`   Expected (Account 1): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(body).digest('base64')}`);
      console.log(`   Expected (Account 2): ${crypto.createHmac('sha256', LINE_CHANNEL_SECRET_2).update(body).digest('base64')}`);
      console.log(`   Received: ${signature}`);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
    
    const accessToken = credentials.token;
    const events = req.body.events || [];
    const accountNumber = getAccountNumber(channelId);
    
    console.log(`📨 Webhook handler started`);
    console.log(`   Events count: ${events.length}`);
    console.log(`   Account: ${accountNumber}`);
    
    for (const event of events) {
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
            
            // Find matching bets
            const matchingBets = await findMatchingBets(resultData.fireworkName, resultData.resultNumber);
            console.log(`   Found ${matchingBets.length} matching bet(s)`);
            
            // Update each matching bet
            for (const bet of matchingBets) {
              await updateBetResult(bet.rowIndex, resultData.resultNumber, resultData.result);
            }
            
            if (matchingBets.length > 0) {
              console.log(`✅ Results updated successfully`);
            }
          } else {
            // Detect pair
            const pair = detectPair(message);
            
            if (pair) {
              console.log(`   messageA: "${pair.messageA}"`);
              console.log(`   messageB: "${pair.messageB}"`);
              
              // Fetch user names and group name
              console.log('👤 Fetching user profiles and group name...');
              const userAName = await getLineUserProfile(pair.userA, accessToken);
              const userBName = await getLineUserProfile(pair.userB, accessToken);
              const groupName = await getLineGroupName(pair.groupId, accessToken);
              
              console.log(`   User A: ${userAName}`);
              console.log(`   User B: ${userBName}`);
              console.log(`   Group: ${groupName}`);
              
              // Record to Google Sheets
              await appendToGoogleSheets(pair, userAName, userBName, groupName);
              console.log(`✅ Pair recorded successfully`);
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

// ===== START SERVER =====
async function start() {
  try {
    await initializeSheets();
    
    // Register Slip2Go webhook router
    const createSlip2GoWebhookRouter = require('./routes/slip2GoWebhook');
    const slip2GoRouter = createSlip2GoWebhookRouter(
      googleAuth,
      GOOGLE_SHEET_ID,
      LINE_CHANNEL_ACCESS_TOKEN_2,
      process.env.SLIP2GO_SECRET_KEY
    );
    app.use('/slip2go', slip2GoRouter);
    
    app.listen(PORT, () => {
      console.log(`\n🚀 LINE Betting Bot listening on port ${PORT}`);
      console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
      console.log(`📍 Slip2Go Webhook URL: http://localhost:${PORT}/slip2go/slip-verified`);
      console.log(`✅ Ready to receive messages\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
