require('dotenv').config();
const express = require('express');
const { initializeDatabase: initializeGoogleSheets } = require('./services/googleSheetsDatabaseService');
const { handleBettingMessage } = require('./handlers/messageHandler');
const { handleVenueSelection } = require('./handlers/venueHandler');
const { handleBetHistorySearch } = require('./handlers/searchHandler');
const { storeMessage, handleMessageDelete } = require('./handlers/deleteHandler');
const { client } = require('./config/line');

const app = express();

// Middleware - ต้องอยู่ก่อน routes
// LINE webhook middleware - ต้องรับ raw body และอยู่ก่อน express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🔔 Webhook received');
  
  // ตอบกลับ 200 ทันที (ต้องทำก่อนประมวลผล)
  res.status(200).send('OK');
  
  // Parse body
  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }
    
    console.log('📨 Full webhook body:', JSON.stringify(body, null, 2));
    console.log('📨 Events:', body.events?.length);
    
    // ประมวลผล events แบบ async (ไม่รอให้เสร็จ)
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(event => {
        // ใช้ setImmediate เพื่อให้ประมวลผลแบบ non-blocking
        setImmediate(() => {
          handleEvent(event).catch(err => console.error('Error handling event:', err));
        });
      });
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
});

// Support root path
app.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🔔 Webhook received (root)');
  
  // ตอบกลับ 200 ทันที (ต้องทำก่อนประมวลผล)
  res.status(200).send('OK');
  
  // Parse body
  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }
    
    console.log('📨 Events:', body.events?.length);
    
    // ประมวลผล events แบบ async (ไม่รอให้เสร็จ)
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(event => {
        // ใช้ setImmediate เพื่อให้ประมวลผลแบบ non-blocking
        setImmediate(() => {
          handleEvent(event).catch(err => console.error('Error handling event:', err));
        });
      });
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
});

// JSON middleware สำหรับ routes อื่น (ต้องอยู่หลัง webhook routes)
app.use(express.json());

// Serve static files (for LIFF)
app.use(express.static('public'));

// Payment routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api', paymentRoutes);

// Initialize Google Sheets Database
console.log('🔄 Initializing Google Sheets Database...');
initializeGoogleSheets().then((success) => {
  if (success) {
    console.log('✅ Google Sheets Database initialized');
  } else {
    console.warn('⚠️ Google Sheets Database initialization failed');
  }
});

// Initialize Open Betting Record Service
console.log('🔄 Initializing Open Betting Record Service...');
const openBettingRecordService = require('./services/openBettingRecordService');
openBettingRecordService.initialize().then((success) => {
  if (success) {
    console.log('✅ Open Betting Record Service initialized');
  } else {
    console.warn('⚠️ Open Betting Record Service initialization failed');
  }
});

// Health check
const { getHealthStatus } = require('./utils/monitoring');

app.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Get all groups/rooms where bot is active
app.get('/api/groups', async (req, res) => {
  try {
    const googleSheetsService = require('./services/googleSheetsService');
    
    // Initialize Google Sheets
    await googleSheetsService.initializeGoogleSheets();
    
    // Try to get groups from Google Sheets first
    const sheetsResult = await googleSheetsService.getSheetData('Groups');
    
    let groups = [];
    let source = 'local';
    
    if (sheetsResult.success && sheetsResult.data && sheetsResult.data.length > 1) {
      // Parse data from Google Sheets (skip header row)
      groups = sheetsResult.data.slice(1).map((row) => ({
        timestamp: row[0] || '',
        id: row[1] || '',
        name: row[2] || '',
        status: row[3] || 'Active',
      })).filter((g) => g.id); // Filter out empty rows
      
      console.log('✅ Groups loaded from Google Sheets:', groups.length);
      source = 'google-sheets';
    } else {
      // Fallback to local groups
      console.log('⚠️ Could not load from Google Sheets, using local groups');
      const groupManagementService = require('./services/groupManagementService');
      const localGroups = groupManagementService.getAllGroups();
      groups = localGroups.map(g => ({
        id: g.id,
        name: g.name,
        createdAt: g.createdAt,
        lastActive: g.lastActive,
      }));
      source = 'local';
    }
    
    res.status(200).json({
      success: true,
      count: groups.length,
      groups,
      source,
    });
  } catch (error) {
    console.error('❌ Error getting groups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint - test webhook manually
app.post('/api/test-webhook', express.json(), (req, res) => {
  try {
    console.log('🧪 Test webhook called');
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));
    
    const event = {
      type: 'message',
      message: {
        type: 'text',
        text: req.body.text || 'test message',
        id: 'test-msg-id'
      },
      source: {
        type: 'group',
        groupId: req.body.groupId || 'test-group-id',
        userId: req.body.userId || 'test-user-id'
      },
      replyToken: 'test-reply-token',
      timestamp: Date.now()
    };
    
    console.log('🧪 Processing test event:', JSON.stringify(event, null, 2));
    
    // Process event
    handleEvent(event).then(() => {
      res.status(200).json({ success: true, message: 'Test webhook processed' });
    }).catch(err => {
      console.error('❌ Error processing test webhook:', err);
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    console.error('❌ Error in test webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint - check webhook configuration
app.get('/api/debug/webhook', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      webhook: {
        url: 'https://line-betting-bot.onrender.com/webhook',
        status: 'active',
        lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✓ set' : '✗ not set',
        lineChannelSecret: process.env.LINE_CHANNEL_SECRET ? '✓ set' : '✗ not set',
        googleSheetsId: process.env.GOOGLE_SHEETS_ID ? '✓ set' : '✗ not set',
        googleCredentials: process.env.GOOGLE_CREDENTIALS_BASE64 ? '✓ set' : '✗ not set',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific group details
app.get('/api/groups/:groupId', (req, res) => {
  try {
    const groupManagementService = require('./services/groupManagementService');
    const group = groupManagementService.getGroup(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    res.status(200).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        lastActive: group.lastActive,
      },
    });
  } catch (error) {
    console.error('❌ Error getting group:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update group name
app.put('/api/groups/:groupId', express.json(), (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Group name is required' });
    }
    
    const groupManagementService = require('./services/groupManagementService');
    const success = groupManagementService.updateGroupName(req.params.groupId, name);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Group name updated',
    });
  } catch (error) {
    console.error('❌ Error updating group:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Webhook event handler
async function handleEvent(event) {
  console.log('📨 Received event:', JSON.stringify(event, null, 2));
  
  // Handle join event - when OA is added to a group
  if (event.type === 'join') {
    console.log('🎉 Join event detected');
    try {
      const { GroupAutoDetectService } = require('./services/groupAutoDetectService');
      await GroupAutoDetectService.handleJoinEvent(event);
    } catch (error) {
      console.error('❌ Error handling join event:', error);
    }
    return Promise.resolve(null);
  }
  
  // Handle leave event - when OA is removed from a group
  if (event.type === 'leave') {
    console.log('👋 Leave event detected');
    try {
      const { GroupAutoDetectService } = require('./services/groupAutoDetectService');
      await GroupAutoDetectService.handleLeaveEvent(event);
    } catch (error) {
      console.error('❌ Error handling leave event:', error);
    }
    return Promise.resolve(null);
  }
  
  // Record group activity if from group
  if (event.source.type === 'group' || event.source.type === 'room') {
    const groupManagementService = require('./services/groupManagementService');
    const groupId = event.source.groupId || event.source.roomId;
    
    if (groupId) {
      console.log(`📝 Recording group activity: ${groupId}`);
      await groupManagementService.recordGroupActivity(groupId, null, client);
    }
  }
  
  // Handle postback events (Rich Menu buttons)
  if (event.type === 'postback') {
    console.log('📤 Processing postback event:', event.postback.data);
    const { PostbackHandler } = require('./handlers/postbackHandler');
    await PostbackHandler.handle(event);
    return Promise.resolve(null);
  }
  
  // Handle message delete event
  if (event.type === 'unsend') {
    console.log('🗑️ Message delete event detected');
    await handleMessageDelete(event);
    return Promise.resolve(null);
  }
  
  if (event.type !== 'message') {
    console.log('⏭️ Skipping non-message event');
    return Promise.resolve(null);
  }

  if (event.message.type !== 'text') {
    console.log('⏭️ Skipping non-text message');
    return Promise.resolve(null);
  }

  // Store message for tracking deletions
  storeMessage(event.message.id, event);

  const messageText = event.message.text.trim().replace(/\n/g, ' ');
  console.log('💬 Message text:', messageText);

  // Determine if this is a group or 1-on-1 chat
  const isGroupChat = event.source.type === 'group' || event.source.type === 'room';
  const isOfficialChat = event.source.type === 'user';
  
  console.log(`📍 Chat type: ${isGroupChat ? 'GROUP' : 'OFFICIAL'}`);

  try {
    // Check for เปิดรับแทง command
    if (messageText === 'เปิดรับแทง') {
      console.log('🎯 Open betting command detected');
      try {
        const openBettingService = require('./services/openBettingService');
        const groupId = event.source.groupId || event.source.roomId;
        console.log('📝 Calling requestOpenBettingInput with:', { replyToken: event.replyToken, userId: event.source.userId, groupId });
        await openBettingService.requestOpenBettingInput(event.replyToken, event.source.userId, groupId);
        console.log('✅ requestOpenBettingInput completed');
      } catch (error) {
        console.error('❌ Error in open betting command:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด: ' + error.message,
        });
      }
      return Promise.resolve(null);
    }

    // Check for เช็คห้องแชท command
    if (messageText === 'เช็คห้องแชท') {
      console.log('🔍 Check groups command detected');
      try {
        const googleSheetsService = require('./services/googleSheetsService');
        
        // Initialize Google Sheets
        await googleSheetsService.initializeGoogleSheets();
        
        // Get groups from Groups sheet
        const result = await googleSheetsService.getSheetData('Groups');
        
        let responseText = '📊 ห้องแชทที่มีในระบบ:\n\n';
        
        if (result.success && result.data && result.data.length > 1) {
          // Skip header row
          result.data.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            if (row && row.length >= 3 && row[1] && row[2]) {
              const timestamp = (row[0] || '-').trim();
              const groupId = (row[1] || '').trim();
              const groupName = (row[2] || '').trim();
              const status = (row[3] || 'Active').trim();
              
              responseText += `${index}. ${groupName}\n`;
              responseText += `   ID: ${groupId}\n`;
              responseText += `   สถานะ: ${status}\n`;
              responseText += `   เข้าร่วม: ${timestamp}\n\n`;
            }
          });
          
          responseText += `✅ รวมทั้งหมด ${result.data.length - 1} ห้องแชท`;
        } else {
          responseText = '⚠️ ไม่พบห้องแชทในระบบ';
        }
        
        console.log('📤 Sending groups list:', responseText);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: responseText,
        });
      } catch (error) {
        console.error('❌ Error in check groups command:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด: ' + error.message,
        });
      }
      return Promise.resolve(null);
    }

    // Check for สรุปยอดแทง command
    if (messageText === 'สรุปยอดแทง') {
      console.log('📊 Summary command detected');
      try {
        const { handleSummaryCommand } = require('./handlers/summaryHandler');
        await handleSummaryCommand(event);
      } catch (error) {
        console.error('❌ Error in summary command:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด: ' + error.message,
        });
      }
      return Promise.resolve(null);
    }

    // Check for สรุปยอดโอนเงิน command
    if (messageText === 'สรุปยอดโอนเงิน') {
      console.log('💰 Payout summary command detected');
      try {
        const { handlePayoutSummaryCommand } = require('./handlers/summaryHandler');
        await handlePayoutSummaryCommand(event);
      } catch (error) {
        console.error('❌ Error in payout summary command:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด: ' + error.message,
        });
      }
      return Promise.resolve(null);
    }

    // Check for สรุปผลแข่ง command
    if (messageText === 'สรุปผลแข่ง') {
      console.log('📊 Result summary command detected');
      try {
        const resultSummaryService = require('./services/resultSummaryService');
        const groupId = event.source.groupId || event.source.roomId;
        console.log('📝 Calling requestResultSummaryInput with:', { replyToken: event.replyToken, userId: event.source.userId, groupId });
        await resultSummaryService.requestResultSummaryInput(event.replyToken, event.source.userId, groupId);
        console.log('✅ requestResultSummaryInput completed');
      } catch (error) {
        console.error('❌ Error in result summary command:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด: ' + error.message,
        });
      }
      return Promise.resolve(null);
    }

    // Check for ส่งลิงค์การโอนเงิน command (with or without tone mark, with or without เงิน)
    if (messageText === 'ส่งลิ้งค์การโอนเงิน' || messageText === 'ส่งลิงค์การโอนเงิน' || messageText === 'ส่งลิ้งค์การโอน' || messageText === 'ส่งลิงค์การโอน') {
      console.log('💳 Payment link command detected');
      try {
        const PaymentLinkService = require('./services/paymentLinkService');
        console.log('📝 PaymentLinkService loaded:', typeof PaymentLinkService);
        const groupId = event.source.groupId || event.source.roomId;
        console.log('📝 Calling requestPaymentLinkInput with:', { replyToken: event.replyToken, userId: event.source.userId, groupId });
        await PaymentLinkService.requestPaymentLinkInput(event.replyToken, event.source.userId, groupId);
        console.log('✅ requestPaymentLinkInput completed');
      } catch (error) {
        console.error('❌ Error in payment link command:', error);
      }
      return Promise.resolve(null);
    }

    // Check for ส่งลิงค์การโอนเงิน input (payment link data) - MUST BE BEFORE ADMIN CHECK
    if (messageText.startsWith('ส่งลิ้งค์การโอนเงิน ') || messageText.startsWith('ส่งลิงค์การโอนเงิน ')) {
      console.log('💳 Payment link input detected');
      const PaymentLinkService = require('./services/paymentLinkService');
      await PaymentLinkService.processPaymentLinkInput(event.source.userId, messageText, event.replyToken);
      return Promise.resolve(null);
    }

    // Check for /ยกเลิก command
    if (messageText === '/ยกเลิก') {
      console.log('🗑️ Cancel command detected');
      const { client } = require('./config/line');
      const userId = event.source.userId;
      
      try {
        // Get user profile to get lineName
        const profile = await client.getProfile(userId);
        const lineName = profile.displayName;
        
        console.log('👤 User profile:', { userId, lineName });
        
        // Import googleSheetsService to cancel the latest pending bet
        const googleSheetsService = require('./services/googleSheetsService');
        
        // Get all bets
        const betsResult = await googleSheetsService.getAllBets();
        
        if (!betsResult.success || !betsResult.bets || betsResult.bets.length === 0) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ ไม่พบการแทงที่ต้องยกเลิก',
          });
          return Promise.resolve(null);
        }
        
        // Find the latest pending bet for this user
        const userBets = betsResult.bets.filter(b => b.lineName === lineName && b.result === 'pending');
        
        if (userBets.length === 0) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ ไม่พบการแทงที่ต้องยกเลิก',
          });
          return Promise.resolve(null);
        }
        
        // Get the latest bet
        const latestBet = userBets[userBets.length - 1];
        
        console.log('🎯 Latest pending bet:', latestBet);
        
        // Cancel the bet
        const cancelResult = await googleSheetsService.updateBetStatus(lineName, 'cancel');
        
        if (cancelResult.success) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ ยกเลิกการแทงสำเร็จ\n\n📊 รายละเอียด:\n• สนาม: ${latestBet.venue}\n• ยอดเงิน: ${latestBet.amount} บาท\n• สถานะ: ยกเลิก`,
          });
          
          console.log('✅ Bet cancelled successfully');
        } else {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ ไม่สามารถยกเลิกการแทงได้',
          });
        }
      } catch (error) {
        console.error('❌ Error cancelling bet:', error);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการยกเลิก',
        });
      }
      
      return Promise.resolve(null);
    }

    // Check for /ช่วยเหลือ command
    if (messageText === '/ช่วยเหลือ') {
      console.log('❓ Help command detected');
      const { client } = require('./config/line');
      const helpMessage = `📖 วิธีใช้ LINE Betting Bot\n\n` +
        `🎯 ปุ่มเมนู:\n` +
        `• สรุป: ดูสรุปการแทงทั้งหมด\n` +
        `• ยกเลิก: ยกเลิกการแทงล่าสุด\n` +
        `• ช่วยเหลือ: ดูวิธีใช้\n\n` +
        `💬 พิมพ์ข้อความ:\n` +
        `• พิมพ์ข้อความใดๆ เพื่อบันทึกการแทง`;

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: helpMessage,
      });
      return Promise.resolve(null);
    }

    // ===== OFFICIAL CHAT (1-on-1) - NO LOGGING =====
    if (isOfficialChat) {
      console.log('📱 Official chat detected - processing commands');
      
      // Process commands for all users (no admin check)
      const { TextMessageHandler } = require('./handlers/textMessageHandler');
      await TextMessageHandler.handle(event);
      return Promise.resolve(null);
    }

    // ===== GROUP CHAT - LOG ALL MESSAGES =====
    if (isGroupChat) {
      console.log('👥 Group chat detected - logging all messages');
      
      // Get user profile
      const { client } = require('./config/line');
      let userProfile;
      try {
        userProfile = await client.getProfile(event.source.userId);
      } catch (error) {
        console.warn('⚠️ Could not get user profile:', error);
        userProfile = { displayName: 'Unknown User' };
      }
      
      const lineName = userProfile.displayName || 'Unknown User';
      const userId = event.source.userId;
      
      // Store ALL messages as-is (no filtering)
      const { recordBet } = require('./services/googleSheetsDatabaseService');
      
      console.log(`📝 Storing message from ${lineName}: "${messageText}"`);
      
      // Record the entire message to Google Sheets
      const result = await recordBet(userId, lineName, 'ข้อความ', messageText);
      
      if (result.success) {
        console.log('✅ Message stored to Google Sheets');
      } else {
        console.error('❌ Failed to store message:', result.error);
      }
      
      // No auto-reply in group chat
      return Promise.resolve(null);
    }

  } catch (error) {
    console.error('❌ Error handling event:', error);
  }

  return Promise.resolve(null);
}

/**
 * Show help message
 */
async function showHelp(event) {
  const { client } = require('./config/line');

  const helpMessage = `📖 วิธีใช้ LINE Betting Bot\n\n` +
    `🎯 คำสั่งพื้นฐาน:\n` +
    `• แทง: พิมพ์ "ต200" (สนาม + ยอดเงิน)\n` +
    `• เลือกสนาม: พิมพ์ "เลือกแทงต" หรือ "ต"\n` +
    `• ดูสนาม: พิมพ์ "รายชื่อสนาม"\n` +
    `• ประวัติ: พิมพ์ "ประวัติ"\n\n` +
    `👨‍💼 คำสั่งแอดมิน:\n` +
    `• ปิดรอบ: "ปิดรอบ [roundId]"\n` +
    `• ประกาศผู้ชนะ: "ประกาศผู้ชนะ [roundId] [userId1,userId2]"\n` +
    `• เพิ่มสนาม: "เพิ่มสนาม [name] [link]"\n` +
    `• รายงาน: "รายงาน [roundId]"`;

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: helpMessage,
  });
}

// Error handling middleware
app.use((err, _req, _res, _next) => {
  console.error('Error:', err);
  _res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
