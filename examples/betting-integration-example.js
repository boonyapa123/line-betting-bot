/**
 * ตัวอย่างการ Integrate Betting Round System กับ Express Server
 * 
 * นี่คือตัวอย่างวิธีการเพิ่ม Betting Routes เข้าไปใน Express app
 */

const express = require('express');
const bettingRoutes = require('../routes/betting-webhook');

/**
 * ตัวอย่างที่ 1: Basic Integration
 */
function example1_basicIntegration() {
  console.log('=== ตัวอย่างที่ 1: Basic Integration ===\n');

  const code = `
const express = require('express');
const bettingRoutes = require('./routes/betting-webhook');

const app = express();

// Middleware
app.use(express.json());

// Betting Routes
app.use('/api/betting', bettingRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  console.log('Betting webhook: POST /api/betting/webhook');
});
`;

  console.log(code);
}

/**
 * ตัวอย่างที่ 2: LINE Bot Integration
 */
function example2_lineBotIntegration() {
  console.log('\n=== ตัวอย่างที่ 2: LINE Bot Integration ===\n');

  const code = `
const express = require('express');
const line = require('@line/bot-sdk');
const bettingRoutes = require('./routes/betting-webhook');

const app = express();

// LINE Bot Configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new line.Client(lineConfig);

// Middleware
app.use(express.json());

// LINE Webhook
app.post('/line/webhook', line.middleware(lineConfig), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      // ส่งไปยัง Betting Controller
      const response = await handleBettingMessage(event);
      
      // ส่งตอบกลับไปยัง LINE
      if (response) {
        await lineClient.replyMessage(event.replyToken, response);
      }
    }
  }

  res.status(200).send('OK');
});

// Betting Routes (Admin API)
app.use('/api/betting', bettingRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

async function handleBettingMessage(event) {
  const bettingRoundController = require('./services/betting/bettingRoundController');
  await bettingRoundController.initialize();
  return await bettingRoundController.handleMessage(event);
}
`;

  console.log(code);
}

/**
 * ตัวอย่างที่ 3: Admin Dashboard API
 */
function example3_adminDashboardAPI() {
  console.log('\n=== ตัวอย่างที่ 3: Admin Dashboard API ===\n');

  const code = `
const express = require('express');
const bettingRoutes = require('./routes/betting-webhook');

const app = express();

// Middleware
app.use(express.json());

// Betting Routes
app.use('/api/betting', bettingRoutes);

// Admin Dashboard Endpoints
app.get('/admin/dashboard', async (req, res) => {
  try {
    const bettingRoundStateService = require('./services/betting/bettingRoundStateService');
    const bettingPairingService = require('./services/betting/bettingPairingService');

    const state = bettingRoundStateService.getCurrentState();
    const round = bettingRoundStateService.getCurrentRound();
    const transactions = await bettingPairingService.getAllBets();
    const balances = await bettingPairingService.getAllBalances();

    res.json({
      state,
      round,
      transactionCount: transactions.length,
      transactions,
      balances,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
  console.log('Admin Dashboard: GET /admin/dashboard');
});
`;

  console.log(code);
}

/**
 * ตัวอย่างที่ 4: Error Handling
 */
function example4_errorHandling() {
  console.log('\n=== ตัวอย่างที่ 4: Error Handling ===\n');

  const code = `
const express = require('express');
const bettingRoutes = require('./routes/betting-webhook');

const app = express();

// Middleware
app.use(express.json());

// Betting Routes
app.use('/api/betting', bettingRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.message.includes('credentials')) {
    return res.status(500).json({
      error: 'Google Sheets credentials not configured',
      hint: 'Please set up credentials.json and GOOGLE_SHEETS_ID',
    });
  }

  if (err.message.includes('Spreadsheet')) {
    return res.status(500).json({
      error: 'Cannot access Google Sheets',
      hint: 'Check GOOGLE_SHEETS_ID and permissions',
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

  console.log(code);
}

/**
 * ตัวอย่างที่ 5: Environment Setup
 */
function example5_environmentSetup() {
  console.log('\n=== ตัวอย่างที่ 5: Environment Setup ===\n');

  const envExample = `
# .env.example
# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_spreadsheet_id_here

# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Server Configuration
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info
`;

  console.log(envExample);

  console.log('\n# วิธีการตั้งค่า:');
  console.log('1. คัดลอก .env.example เป็น .env');
  console.log('2. ใส่ค่า credentials ของคุณ');
  console.log('3. ตรวจสอบว่า .env อยู่ใน .gitignore');
}

/**
 * ตัวอย่างที่ 6: Testing with cURL
 */
function example6_testingWithCurl() {
  console.log('\n=== ตัวอย่างที่ 6: Testing with cURL ===\n');

  const commands = `
# ตรวจสอบสถานะ
curl http://localhost:3000/api/betting/status

# เปิดรอบ
curl -X POST http://localhost:3000/api/betting/admin/start \\
  -H "Content-Type: application/json" \\
  -d '{"slipName": "ฟ้าหลังฝน"}'

# ปิดรอบ
curl -X POST http://localhost:3000/api/betting/admin/stop

# สรุปผลลัพธ์
curl -X POST http://localhost:3000/api/betting/admin/calculate \\
  -H "Content-Type: application/json" \\
  -d '{"slipName": "ฟ้าหลังฝน", "score": 315}'

# ดึงข้อมูลการเล่น
curl http://localhost:3000/api/betting/transactions

# ดึงยอดเงิน
curl http://localhost:3000/api/betting/balances

# ดึงยอดเงินของ User เฉพาะคน
curl http://localhost:3000/api/betting/balance/U001
`;

  console.log(commands);
}

/**
 * ตัวอย่างที่ 7: Docker Setup
 */
function example7_dockerSetup() {
  console.log('\n=== ตัวอย่างที่ 7: Docker Setup ===\n');

  const dockerfile = `
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "index.js"]
`;

  console.log(dockerfile);

  const dockerCompose = `
# docker-compose.yml
version: '3.8'

services:
  betting-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GOOGLE_SHEETS_ID=\${GOOGLE_SHEETS_ID}
      - LINE_CHANNEL_ACCESS_TOKEN=\${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=\${LINE_CHANNEL_SECRET}
      - NODE_ENV=production
    volumes:
      - ./credentials.json:/app/credentials.json:ro
    restart: unless-stopped
`;

  console.log(dockerCompose);
}

// รัน examples
if (require.main === module) {
  example1_basicIntegration();
  example2_lineBotIntegration();
  example3_adminDashboardAPI();
  example4_errorHandling();
  example5_environmentSetup();
  example6_testingWithCurl();
  example7_dockerSetup();
}

module.exports = {
  example1_basicIntegration,
  example2_lineBotIntegration,
  example3_adminDashboardAPI,
  example4_errorHandling,
  example5_environmentSetup,
  example6_testingWithCurl,
  example7_dockerSetup,
};
