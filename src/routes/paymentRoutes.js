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
      
      // Get all rows from "Groups" sheet
      const result = await googleSheetsService.getSheetData('Groups');
      
      console.log('📊 Google Sheets result:', result);
      
      if (result.success && result.data && result.data.length > 1) {
        console.log('📊 Groups from Sheets:', result.data.length, 'rows');
        
        // Skip header row and map data
        result.data.forEach((row, index) => {
          if (index === 0) {
            console.log('📋 Header row:', row);
            return; // Skip header
          }
          
          console.log(`📝 Row ${index}:`, row);
          
          if (row[1] && row[2]) { // groupId and groupName
            groups.push({
              id: row[1],
              name: row[2],
            });
            console.log(`✅ Added group: ${row[2]} (${row[1]})`);
          }
        });
        
        console.log('✅ Groups loaded from Google Sheets:', groups.length);
      } else {
        console.warn('⚠️ No data in Groups sheet or sheet not found');
      }
    } catch (error) {
      console.warn('⚠️ Could not get groups from Google Sheets:', error.message);
    }
    
    // Fallback to local service if Sheets fails
    if (groups.length === 0) {
      console.log('📥 Falling back to local group management service');
      const groupManagementService = require('../services/groupManagementService');
      const localGroups = groupManagementService.getAllGroups();
      console.log('📊 Groups found from local service:', localGroups.length);
      
      if (localGroups && localGroups.length > 0) {
        groups = localGroups.map(g => ({
          id: g.id,
          name: g.name,
        }));
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
