require('dotenv').config();
const express = require('express');
const { initializeDatabase: initializeGoogleSheets } = require('./services/googleSheetsDatabaseService');
const { handleBettingMessage } = require('./handlers/messageHandler');
const { handleVenueSelection } = require('./handlers/venueHandler');
const { handleBetHistorySearch } = require('./handlers/searchHandler');
const { storeMessage, handleMessageDelete } = require('./handlers/deleteHandler');

const app = express();

// Middleware - ต้องอยู่ก่อน routes
// LINE webhook middleware - ต้องรับ raw body และอยู่ก่อน express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🔔 Webhook received');
  
  // ตอบกลับ 200 ทันที
  res.status(200).send('OK');
  
  // Parse body
  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }
    
    console.log('📨 Full webhook body:', JSON.stringify(body, null, 2));
    console.log('📨 Events:', body.events?.length);
    
    // ประมวลผล events
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(event => {
        handleEvent(event).catch(err => console.error('Error:', err));
      });
    }
  } catch (error) {
    console.error('Parse error:', error);
  }
});

// Support root path
app.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  console.log('🔔 Webhook received (root)');
  
  // ตอบกลับ 200 ทันที
  res.status(200).send('OK');
  
  // Parse body
  try {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }
    
    console.log('📨 Events:', body.events?.length);
    
    // ประมวลผล events
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(event => {
        handleEvent(event).catch(err => console.error('Error:', err));
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

// Webhook event handler
async function handleEvent(event) {
  console.log('📨 Received event:', JSON.stringify(event, null, 2));
  
  // Record group activity if from group
  if (event.source.type === 'group' || event.source.type === 'room') {
    const groupManagementService = require('./services/groupManagementService');
    const { client } = require('./config/line');
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
        const groupId = process.env.LINE_GROUP_ID;
        console.log('📝 Calling requestOpenBettingInput with:', { replyToken: event.replyToken, userId: event.source.userId, groupId });
        await openBettingService.requestOpenBettingInput(event.replyToken, event.source.userId, groupId);
        console.log('✅ requestOpenBettingInput completed');
      } catch (error) {
        console.error('❌ Error in open betting command:', error);
      }
      return Promise.resolve(null);
    }

    // Check for สรุปยอดแทง command
    if (messageText === 'สรุปยอดแทง') {
      console.log('📊 Summary command detected');
      const { handleSummaryCommand } = require('./handlers/summaryHandler');
      await handleSummaryCommand(event);
      return Promise.resolve(null);
    }

    // Check for สรุปยอดโอนเงิน command
    if (messageText === 'สรุปยอดโอนเงิน') {
      console.log('💰 Payout summary command detected');
      const { handlePayoutSummaryCommand } = require('./handlers/summaryHandler');
      await handlePayoutSummaryCommand(event);
      return Promise.resolve(null);
    }

    // Check for สรุปผลแข่ง command
    if (messageText === 'สรุปผลแข่ง') {
      console.log('📊 Result summary command detected');
      try {
        const resultSummaryService = require('./services/resultSummaryService');
        const groupId = process.env.LINE_GROUP_ID;
        console.log('📝 Calling requestResultSummaryInput with:', { replyToken: event.replyToken, userId: event.source.userId, groupId });
        await resultSummaryService.requestResultSummaryInput(event.replyToken, event.source.userId, groupId);
        console.log('✅ requestResultSummaryInput completed');
      } catch (error) {
        console.error('❌ Error in result summary command:', error);
      }
      return Promise.resolve(null);
    }

    // Check for ส่งลิงค์การโอนเงิน command (with or without tone mark, with or without เงิน)
    if (messageText === 'ส่งลิ้งค์การโอนเงิน' || messageText === 'ส่งลิงค์การโอนเงิน' || messageText === 'ส่งลิ้งค์การโอน' || messageText === 'ส่งลิงค์การโอน') {
      console.log('💳 Payment link command detected');
      try {
        const PaymentLinkService = require('./services/paymentLinkService');
        console.log('📝 PaymentLinkService loaded:', typeof PaymentLinkService);
        const groupId = process.env.LINE_GROUP_ID;
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
