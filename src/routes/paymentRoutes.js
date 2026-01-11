/**
 * Payment Routes
 * API endpoints สำหรับจัดการการโอนเงิน
 */

const express = require('express');
const { client } = require('../config/line');
const openBettingRecordService = require('../services/openBettingRecordService');
const resultSummaryService = require('../services/resultSummaryService');

const router = express.Router();

/**
 * Handle CORS preflight requests
 */
router.options('/send-payment-link', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * POST /api/send-payment-link
 * รับข้อมูลการโอนเงินจาก LIFF และส่งไปยังกลุ่ม
 */
router.post('/send-payment-link', async (req, res) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/send-payment-link received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      groupId,
      bankName,
      accountNumber,
      accountName,
      paymentLink,
      note,
      userId,
      timestamp,
    } = req.body;

    console.log('💳 Received payment link request:', {
      groupId,
      bankName,
      accountNumber,
      accountName,
    });

    // Validate required fields
    if (!groupId || !bankName || !accountNumber || !accountName) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Create Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `💳 ข้อมูลการโอนเงิน - ${bankName}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: '💳 ข้อมูลการโอนเงิน',
              size: 'xl',
              weight: 'bold',
              color: '#667eea',
            },
            // Bank name
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🏦 ธนาคาร',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: bankName,
                  size: 'lg',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Account number
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🔢 เลขบัญชี',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: accountNumber,
                  size: 'lg',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Account name
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '👤 ชื่อบัญชี',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: accountName,
                  size: 'lg',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Payment link (if available)
            ...(paymentLink ? [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '🔗 ลิงค์โอนเงิน',
                    size: 'sm',
                    color: '#999999',
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: paymentLink,
                    size: 'sm',
                    color: '#667eea',
                    wrap: true,
                  },
                ],
              },
            ] : []),
            // Note (if available)
            ...(note ? [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '📝 หมายเหตุ',
                    size: 'sm',
                    color: '#999999',
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: note,
                    size: 'sm',
                    color: '#333333',
                    wrap: true,
                  },
                ],
              },
            ] : []),
          ],
        },
      },
    };

    // Send to group
    console.log('📤 Sending payment link to group:', groupId);
    await client.pushMessage(groupId, flexMessage);

    console.log('✅ Payment link sent successfully');

    res.json({
      success: true,
      message: 'Payment link sent successfully',
    });
  } catch (error) {
    console.error('❌ Error sending payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send payment link',
    });
  }
});

/**
 * GET /api/betting/summary
 * ดึงสรุปยอดแทงของวันนี้ (อ่านจากชีท Bets)
 */
router.get('/betting/summary', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log('📊 GET /api/betting/summary requested');

    const { date } = req.query;
    
    // Initialize Google Sheets
    console.log('🔄 Initializing Google Sheets...');
    const googleSheetsService = require('../services/googleSheetsService');
    const initResult = await googleSheetsService.initializeGoogleSheets();
    console.log('✅ Google Sheets initialized:', initResult);
    
    // Get all bets from Bets sheet
    const betsResult = await googleSheetsService.getAllBets();
    
    if (!betsResult.success) {
      return res.status(400).json({
        success: false,
        error: betsResult.error,
      });
    }

    const bets = betsResult.bets || [];
    
    // Group by venue and message (สนาม บั้งไฟ)
    const venueMap = new Map();
    bets.forEach((bet) => {
      const key = `${bet.venue}-${bet.message}`;
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          venue: bet.venue,
          message: bet.message,
          count: 0,
          totalAmount: 0,
          bets: [],
        });
      }
      const venue = venueMap.get(key);
      venue.count++;
      venue.totalAmount += bet.amount || 0;
      venue.bets.push(bet);
    });

    const summary = {
      date: new Date().toISOString().split('T')[0],
      totalBets: bets.length,
      totalAmount: bets.reduce((sum, b) => sum + (b.amount || 0), 0),
      venues: Array.from(venueMap.values()),
    };

    console.log('✅ Betting summary generated:', {
      totalBets: summary.totalBets,
      venues: summary.venues.length,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('❌ Error getting betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get betting summary',
      message: error.message,
    });
  }
});

/**
 * OPTIONS /api/betting/summary
 */
router.options('/betting/summary', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/debug/groups
 * Debug endpoint - ตรวจสอบสถานะการโหลดกลุ่ม
 */
router.get('/debug/groups', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('🔍 DEBUG: GET /api/debug/groups requested');
    
    const debug = {
      timestamp: new Date().toISOString(),
      environment: {
        GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID ? '✓ set' : '✗ not set',
        GOOGLE_CREDENTIALS_BASE64: process.env.GOOGLE_CREDENTIALS_BASE64 ? '✓ set' : '✗ not set',
        GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH ? '✓ set' : '✗ not set',
        GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON ? '✓ set' : '✗ not set',
        LINE_GROUP_ID: process.env.LINE_GROUP_ID ? '✓ set' : '✗ not set',
        LINE_GROUP_IDS: process.env.LINE_GROUP_IDS ? '✓ set' : '✗ not set',
      },
      googleSheets: {},
      groups: [],
      allGroups: [],
    };
    
    // Try to initialize Google Sheets
    try {
      const googleSheetsService = require('../services/googleSheetsService');
      const initResult = await googleSheetsService.initializeGoogleSheets();
      debug.googleSheets.initialized = initResult;
      
      if (initResult) {
        // Try to get Groups sheet data
        const result = await googleSheetsService.getSheetData('Groups');
        debug.googleSheets.getSheetDataResult = result;
        
        if (result.success && result.data) {
          debug.groups = result.data.slice(0, 5); // First 5 rows
          debug.allGroups = result.data; // All rows
          console.log('✅ Groups sheet data:', result.data.length, 'rows');
        }
      }
    } catch (error) {
      debug.googleSheets.error = error.message;
      console.error('❌ Error getting Groups sheet:', error.message);
    }
    
    // Try to get all groups from LINE API
    try {
      console.log('🔍 Checking LINE groups via API...');
      
      // Get bot info
      const botInfo = await client.getBotInfo();
      debug.botInfo = {
        userId: botInfo.userId,
        displayName: botInfo.displayName,
        iconUrl: botInfo.iconUrl,
      };
      console.log('✅ Bot info:', botInfo.displayName);
    } catch (error) {
      debug.botInfo = { error: error.message };
      console.error('❌ Error getting bot info:', error.message);
    }
    
    res.json(debug);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * OPTIONS /api/debug/groups
 */
router.options('/debug/groups', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/debug/all-groups
 * Debug endpoint - ตรวจสอบห้องแชททั้งหมดที่ OA เข้าร่วม
 */
router.get('/debug/all-groups', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('🔍 DEBUG: GET /api/debug/all-groups requested');
    
    const debug = {
      timestamp: new Date().toISOString(),
      groupsFromSheets: [],
      groupsFromLocalService: [],
      groupsFromEnv: [],
    };
    
    // 1. Get groups from Google Sheets
    try {
      console.log('📊 Fetching groups from Google Sheets...');
      const googleSheetsService = require('../services/googleSheetsService');
      const initResult = await googleSheetsService.initializeGoogleSheets();
      
      if (initResult) {
        const result = await googleSheetsService.getSheetData('Groups');
        
        if (result.success && result.data && result.data.length > 1) {
          // Skip header row
          result.data.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            if (row && row.length >= 3 && row[1] && row[2]) {
              debug.groupsFromSheets.push({
                timestamp: row[0],
                groupId: row[1],
                groupName: row[2],
                status: row[3] || 'Active',
              });
            }
          });
          console.log('✅ Groups from Sheets:', debug.groupsFromSheets.length);
        }
      }
    } catch (error) {
      debug.sheetsError = error.message;
      console.warn('⚠️ Error getting groups from Sheets:', error.message);
    }
    
    // 2. Get groups from local service
    try {
      console.log('📥 Fetching groups from local service...');
      const groupManagementService = require('../services/groupManagementService');
      const localGroups = groupManagementService.getAllGroups();
      
      if (localGroups && localGroups.length > 0) {
        debug.groupsFromLocalService = localGroups;
        console.log('✅ Groups from local service:', localGroups.length);
      }
    } catch (error) {
      debug.localServiceError = error.message;
      console.warn('⚠️ Error getting groups from local service:', error.message);
    }
    
    // 3. Get groups from environment variable
    try {
      console.log('🔧 Checking environment variables...');
      const groupIdsEnv = process.env.LINE_GROUP_IDS || process.env.LINE_GROUP_ID;
      
      if (groupIdsEnv) {
        const groupIds = groupIdsEnv.split(',').map(id => id.trim()).filter(id => id);
        
        for (const groupId of groupIds) {
          try {
            const groupSummary = await client.getGroupSummary(groupId);
            debug.groupsFromEnv.push({
              groupId,
              groupName: groupSummary.groupName || 'Unknown',
              iconUrl: groupSummary.iconUrl,
            });
          } catch (error) {
            debug.groupsFromEnv.push({
              groupId,
              error: error.message,
            });
          }
        }
        console.log('✅ Groups from env:', debug.groupsFromEnv.length);
      } else {
        debug.envNote = 'No LINE_GROUP_IDS or LINE_GROUP_ID set';
      }
    } catch (error) {
      debug.envError = error.message;
      console.warn('⚠️ Error getting groups from env:', error.message);
    }
    
    // Summary
    debug.summary = {
      totalFromSheets: debug.groupsFromSheets.length,
      totalFromLocalService: debug.groupsFromLocalService.length,
      totalFromEnv: debug.groupsFromEnv.length,
    };
    
    console.log('📊 Summary:', debug.summary);
    
    res.json(debug);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * OPTIONS /api/debug/all-groups
 */
router.options('/debug/all-groups', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/groups
 * ได้รับรายการกลุ่มทั้งหมด
 */
router.get('/groups', async (req, res) => {
  try {
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('📥 GET /api/groups requested');
    
    let groups = [];
    
    // Try to get groups from Google Sheets first
    try {
      const googleSheetsService = require('../services/googleSheetsService');
      
      console.log('📊 Fetching groups from Google Sheets...');
      console.log('📊 GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID);
      console.log('📊 GOOGLE_CREDENTIALS_BASE64:', process.env.GOOGLE_CREDENTIALS_BASE64 ? '✓ set' : '✗ not set');
      console.log('📊 GOOGLE_CREDENTIALS_FILE:', process.env.GOOGLE_CREDENTIALS_FILE ? '✓ set' : '✗ not set');
      
      // Initialize Google Sheets first
      console.log('🔄 Initializing Google Sheets...');
      const initResult = await googleSheetsService.initializeGoogleSheets();
      console.log('📊 Google Sheets init result:', initResult);
      
      if (!initResult) {
        throw new Error('Failed to initialize Google Sheets');
      }
      
      // Get all rows from "Groups" sheet
      console.log('📥 Getting data from Groups sheet...');
      const result = await googleSheetsService.getSheetData('Groups');
      
      console.log('📊 Google Sheets result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data && result.data.length > 1) {
        console.log('📊 Groups from Sheets:', result.data.length, 'rows');
        
        // Skip header row and map data
        result.data.forEach((row, index) => {
          if (index === 0) {
            console.log('📋 Header row:', row);
            return; // Skip header
          }
          
          console.log(`📝 Row ${index}:`, row);
          
          // Column structure: [timestamp, groupId, groupName, status]
          if (row && row.length >= 3 && row[1] && row[2]) { // groupId (column 1) and groupName (column 2)
            groups.push({
              id: row[1],
              name: row[2],
              status: row[3] || 'Active',
            });
            console.log(`✅ Added group: ${row[2]} (${row[1]})`);
          }
        });
        
        console.log('✅ Groups loaded from Google Sheets:', groups.length);
      } else {
        console.warn('⚠️ No data in Groups sheet or sheet not found');
        console.warn('⚠️ Result:', result);
      }
    } catch (error) {
      console.warn('⚠️ Could not get groups from Google Sheets:', error.message);
      console.warn('⚠️ Error stack:', error.stack);
    }
    
    // Fallback to local service if Sheets fails
    if (groups.length === 0) {
      console.log('📥 Falling back to local group management service');
      try {
        const groupManagementService = require('../services/groupManagementService');
        const localGroups = groupManagementService.getAllGroups();
        console.log('📊 Groups found from local service:', localGroups.length);
        
        if (localGroups && localGroups.length > 0) {
          groups = localGroups.map(g => ({
            id: g.id,
            name: g.name,
          }));
        }
      } catch (localError) {
        console.warn('⚠️ Could not get groups from local service:', localError.message);
      }
    }
    
    // Final fallback to environment variable
    if (groups.length === 0) {
      const groupIdsEnv = process.env.LINE_GROUP_IDS || process.env.LINE_GROUP_ID;
      
      if (groupIdsEnv) {
        console.log('⚠️ No groups in database, using environment variable as fallback');
        
        const groupIds = groupIdsEnv.split(',').map(id => id.trim()).filter(id => id);
        
        for (const groupId of groupIds) {
          try {
            const groupSummary = await client.getGroupSummary(groupId);
            groups.push({
              id: groupId,
              name: groupSummary.groupName || `ห้องแทง ${groups.length + 1}`,
            });
          } catch (error) {
            console.error(`❌ Error getting group summary for ${groupId}:`, error.message);
            groups.push({
              id: groupId,
              name: `ห้องแทง ${groups.length + 1}`,
            });
          }
        }
      }
    }
    
    console.log('📊 Final groups to send:', JSON.stringify(groups, null, 2));
    
    res.json({
      success: true,
      groups,
      count: groups.length,
    });
  } catch (error) {
    console.error('❌ Error getting groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups',
      message: error.message,
    });
  }
});

/**
 * POST /api/send-betting-message
 * ส่งข้อความเปิดรับแทงไปยังกลุ่ม
 */
router.post('/send-betting-message', async (req, res) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/send-betting-message received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      groupId,
      venue,
      fireNumber,
      roomLink,
      note,
      userId,
      timestamp,
    } = req.body;

    // Validate required fields
    if (!groupId || !venue || !fireNumber) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Get group name and user profile
    let groupName = 'ห้องแชท';
    let userName = 'ผู้ใช้';
    
    // Try to get group name from local storage first
    try {
      const groupsFile = require('path').join(__dirname, '../../data/groups.json');
      const fs = require('fs');
      if (fs.existsSync(groupsFile)) {
        const groupsData = JSON.parse(fs.readFileSync(groupsFile, 'utf-8'));
        if (groupsData[groupId]) {
          groupName = groupsData[groupId].name || groupName;
          console.log('✅ Group name from local storage:', groupName);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not get group name from local storage:', error.message || error);
    }

    // Try to get user profile from LINE API
    try {
      if (userId) {
        const userProfile = await client.getProfile(userId);
        userName = userProfile.displayName || userName;
        console.log('✅ User name:', userName);
      }
    } catch (error) {
      console.warn('⚠️ Could not get user profile:', error.message || error);
    }

    // Create Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `🎯 เปิดรับแทง - ${venue} ${fireNumber}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: '🎯 เปิดรับแทง',
              size: 'xl',
              weight: 'bold',
              color: '#667eea',
            },
            // Group name
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '👥 กลุ่ม',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: groupName,
                  size: 'md',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Admin name
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '👤 ผู้เปิดแทง',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: userName,
                  size: 'md',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Venue
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🏟️ สนาม',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: venue,
                  size: 'lg',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Fire number
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '🔥 บั้งไฟ',
                  size: 'sm',
                  color: '#999999',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: fireNumber,
                  size: 'lg',
                  weight: 'bold',
                  color: '#333333',
                },
              ],
            },
            // Room link (if available)
            ...(roomLink ? [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '🔗 ลิงค์ห้องแข่ง',
                    size: 'sm',
                    color: '#999999',
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: roomLink,
                    size: 'sm',
                    color: '#667eea',
                    wrap: true,
                  },
                ],
              },
            ] : []),
            // Note (if available)
            ...(note ? [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: [
                  {
                    type: 'text',
                    text: '📝 หมายเหตุ',
                    size: 'sm',
                    color: '#999999',
                    weight: 'bold',
                  },
                  {
                    type: 'text',
                    text: note,
                    size: 'sm',
                    color: '#333333',
                    wrap: true,
                  },
                ],
              },
            ] : []),
          ],
        },
      },
    };

    // Send to group
    console.log('📤 Sending betting message to group:', groupId);
    await client.pushMessage(groupId, flexMessage);

    // Record to Google Sheets
    console.log('📊 Recording open betting data to Google Sheets');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const recordResult = await openBettingRecordService.recordOpenBetting({
      date: dateStr,
      venue,
      fireNumber,
      roomLink: roomLink || undefined,
      note: note || undefined,
      timestamp: new Date().toISOString(),
      adminId: userId,
    });

    if (recordResult.success) {
      console.log('✅ Data recorded to Google Sheets');
    } else {
      console.warn('⚠️ Failed to record to Google Sheets:', recordResult.error);
    }

    console.log('✅ Betting message sent successfully');

    res.json({
      success: true,
      message: 'Betting message sent successfully',
      recorded: recordResult.success,
    });
  } catch (error) {
    console.error('❌ Error sending betting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send betting message',
    });
  }
});

/**
 * OPTIONS /api/send-betting-message
 * Handle CORS preflight
 */
router.options('/send-betting-message', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * OPTIONS /api/groups
 * Handle CORS preflight
 */
router.options('/groups', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/open-betting-summary
 * ดึงสรุปการเปิดรับแทงของวันนี้ (อ่านจากชีท วันที่ปัจจุบัน)
 */
router.get('/open-betting-summary', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log('📊 GET /api/open-betting-summary requested');

    // Initialize open betting record service
    console.log('🔄 Initializing open betting record service...');
    const initResult = await openBettingRecordService.initialize();
    console.log('✅ Open betting record service initialized:', initResult);

    // Get today's records
    const result = await openBettingRecordService.getTodayRecords();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Generate summary from records
    const records = result.records || [];
    
    // Group by venue and fire number
    const venueMap = new Map();
    records.forEach((record) => {
      const key = `${record.venue}-${record.fireNumber}`;
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          venue: record.venue,
          fireNumber: record.fireNumber,
          count: 0,
          records: [],
        });
      }
      const venue = venueMap.get(key);
      venue.count++;
      venue.records.push(record);
    });

    const summary = {
      date: openBettingRecordService.getTodaySheetName(),
      totalRecords: records.length,
      venues: Array.from(venueMap.values()),
    };

    console.log('✅ Open betting summary generated:', {
      totalRecords: summary.totalRecords,
      venues: summary.venues.length,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('❌ Error getting open betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get open betting summary',
      message: error.message,
    });
  }
});

/**
 * OPTIONS /api/open-betting-summary
 */
router.options('/open-betting-summary', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/open-betting-report
 * ดึงรายงานการเปิดรับแทง
 */
router.get('/open-betting-report', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log('📊 GET /api/open-betting-report requested');

    const { date } = req.query;

    // Initialize open betting record service
    console.log('🔄 Initializing open betting record service...');
    const initResult = await openBettingRecordService.initialize();
    console.log('✅ Open betting record service initialized:', initResult);

    let result;
    if (date) {
      // Get records for specific date
      result = await openBettingRecordService.getRecordsByDate(date);
    } else {
      // Get today's records
      result = await openBettingRecordService.getTodayRecords();
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      records: result.records,
      count: result.records?.length || 0,
    });
  } catch (error) {
    console.error('❌ Error getting open betting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get open betting report',
    });
  }
});

/**
 * GET /api/open-betting-summary
 * ดึงสรุปการเปิดรับแทงของวันนี้
 */
router.get('/open-betting-summary', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log('📊 GET /api/open-betting-summary requested');

    const result = await openBettingRecordService.getTodaySummary();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      summary: result.summary,
    });
  } catch (error) {
    console.error('❌ Error getting open betting summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get open betting summary',
    });
  }
});

/**
 * OPTIONS /api/open-betting-report
 * Handle CORS preflight
 */
router.options('/open-betting-report', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * OPTIONS /api/open-betting-summary
 * Handle CORS preflight
 */
router.options('/open-betting-summary', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * POST /api/send-open-betting-message
 * ส่งข้อความเปิดรับแทงไปยังห้องแชท
 */
router.post('/send-open-betting-message', async (req, res) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/send-open-betting-message received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      groupId,
      message,
      userId,
      timestamp,
    } = req.body;

    console.log('🎯 Received open betting message request:', {
      groupId,
      message,
    });

    // Validate required fields
    if (!groupId || !message) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Send to group
    console.log('📤 Sending open betting message to group:', groupId);
    await client.pushMessage(groupId, {
      type: 'text',
      text: `🎯 เปิดรับแทง\n\n${message}`,
    });

    // Record to Google Sheets
    console.log('📊 Recording open betting data to Google Sheets');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const recordResult = await openBettingRecordService.recordOpenBetting({
      date: dateStr,
      venue: message,
      fireNumber: '',
      roomLink: undefined,
      note: undefined,
      timestamp: new Date().toISOString(),
      adminId: userId,
    });

    if (recordResult.success) {
      console.log('✅ Data recorded to Google Sheets');
    } else {
      console.warn('⚠️ Failed to record to Google Sheets:', recordResult.error);
    }

    console.log('✅ Open betting message sent successfully');

    res.json({
      success: true,
      message: 'Open betting message sent successfully',
      recorded: recordResult.success,
    });
  } catch (error) {
    console.error('❌ Error sending open betting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send open betting message',
    });
  }
});

/**
 * OPTIONS /api/send-open-betting-message
 * Handle CORS preflight
 */
router.options('/send-open-betting-message', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * GET /api/result-summary-venues
 * ดึงรายชื่อสนามของวันนี้
 */
router.get('/result-summary-venues', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log('📊 GET /api/result-summary-venues requested');

    const result = await resultSummaryService.getTodayVenues();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      venues: result.venues,
      count: result.venues?.length || 0,
    });
  } catch (error) {
    console.error('❌ Error getting venues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get venues',
    });
  }
});

/**
 * POST /api/send-result-summary
 * บันทึกผลแข่ง
 */
router.post('/send-result-summary', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/send-result-summary received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      venue,
      result,
      note,
      userId,
      timestamp,
    } = req.body;

    console.log('📊 Received result summary:', {
      venue,
      result,
      note,
    });

    // Validate required fields
    if (!venue || !result) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Create message
    const resultEmoji = result === 'ชนะ' ? '✅' : result === 'แพ้' ? '❌' : '⛔';
    const message = `📊 ผลแข่ง\n\nสนาม: ${venue}\nผลแข่ง: ${resultEmoji} ${result}${note ? '\nหมายเหตุ: ' + note : ''}`;

    // Send to group (if groupId is available)
    // For now, just log it
    console.log('📤 Result summary:', message);

    console.log('✅ Result summary recorded successfully');

    res.json({
      success: true,
      message: 'Result summary recorded successfully',
    });
  } catch (error) {
    console.error('❌ Error sending result summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send result summary',
    });
  }
});

/**
 * OPTIONS /api/result-summary-venues
 * Handle CORS preflight
 */
router.options('/result-summary-venues', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * OPTIONS /api/send-result-summary
 * Handle CORS preflight
 */
router.options('/send-result-summary', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * POST /api/send-result-summary-batch
 * บันทึกผลแข่งหลายรายการ
 */
router.post('/send-result-summary-batch', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/send-result-summary-batch received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      results,
      groupId,
      userId,
      timestamp,
    } = req.body;

    console.log('📊 Received result summary batch:', results);
    console.log('🔗 Target group ID:', groupId);

    // Validate required fields
    if (!results || Object.keys(results).length === 0) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Get result text (from textarea)
    const resultText = results['ผลแข่ง'] || Object.values(results)[0] || '';

    if (!resultText) {
      return res.status(400).json({
        success: false,
        error: 'No result text provided',
      });
    }

    console.log('📝 Result text:', resultText);

    // Save to Google Sheets
    const saveResult = await resultSummaryService.saveResultSummary(resultText);
    if (!saveResult.success) {
      console.warn('⚠️ Failed to save to Google Sheets:', saveResult.error);
    }

    // Send to LINE group - use provided groupId or fallback to env variable
    const targetGroupId = groupId || process.env.LINE_GROUP_ID;
    if (targetGroupId) {
      const sendResult = await resultSummaryService.sendResultToGroup(targetGroupId, resultText);
      if (!sendResult.success) {
        console.warn('⚠️ Failed to send to group:', sendResult.error);
      }
    } else {
      console.warn('⚠️ No group ID provided and LINE_GROUP_ID not set');
    }

    console.log('✅ Result summary batch recorded successfully');

    res.json({
      success: true,
      message: 'Result summary recorded and sent successfully',
    });
  } catch (error) {
    console.error('❌ Error sending result summary batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send result summary batch',
    });
  }
});

/**
 * OPTIONS /api/send-result-summary-batch
 * Handle CORS preflight
 */
router.options('/send-result-summary-batch', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * POST /api/cancel-betting
 * ยกเลิกการแทง - เปลี่ยนสถานะเป็น cancel ใน Google Sheets
 */
router.post('/cancel-betting', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔔 POST /api/cancel-betting received');
  console.log('📨 Request body:', req.body);
  
  try {
    const {
      bettingId,
      venue,
      fireNumber,
      playerName,
      userId,
      timestamp,
    } = req.body;

    console.log('❌ Received cancel betting request:', {
      bettingId,
      venue,
      fireNumber,
      playerName,
      userId,
    });

    // Validate required fields
    if (!bettingId && !playerName) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (bettingId or playerName)',
      });
    }

    // Import googleSheetsService
    const googleSheetsService = require('../services/googleSheetsService');

    // Update bet status to cancelled
    const cancelResult = await googleSheetsService.updateBetStatus(
      bettingId || playerName,
      'cancel'
    );

    if (!cancelResult.success) {
      console.error('❌ Failed to cancel betting:', cancelResult.error);
      return res.status(400).json({
        success: false,
        error: cancelResult.error || 'Failed to cancel betting',
      });
    }

    console.log('✅ Betting cancelled successfully');

    res.json({
      success: true,
      message: 'Betting cancelled successfully',
      cancelledId: bettingId || playerName,
    });
  } catch (error) {
    console.error('❌ Error cancelling betting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel betting',
    });
  }
});

/**
 * OPTIONS /api/cancel-betting
 * Handle CORS preflight
 */
router.options('/cancel-betting', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

module.exports = router;
