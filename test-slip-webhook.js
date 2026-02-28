const https = require('https');
const crypto = require('crypto');

// ข้อมูลจาก .env
const LINE_CHANNEL_SECRET = '749db713285115a94531a93cf4d17033'; // LINE_SLIP_VERIFICATION_CHANNEL_SECRET
const WEBHOOK_URL = 'https://line-betting-bot.onrender.com/webhook';

// สร้าง test payload
const testPayload = {
  events: [
    {
      type: 'message',
      message: {
        type: 'image',
        id: '100001',
      },
      source: {
        type: 'user',
        userId: 'U1234567890abcdef1234567890abcdef',
      },
      timestamp: Date.now(),
    },
  ],
  destination: 'xxxxxxxxxx',
};

const body = JSON.stringify(testPayload);

// สร้าง signature
const signature = crypto
  .createHmac('sha256', LINE_CHANNEL_SECRET)
  .update(body)
  .digest('base64');

console.log('📤 ส่ง test webhook...');
console.log(`   URL: ${WEBHOOK_URL}`);
console.log(`   Signature: ${signature}`);
console.log(`   Body:`, testPayload);

const url = new URL(WEBHOOK_URL);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Line-Signature': signature,
  },
};

https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log(`\n✅ Response: ${res.statusCode}`);
    console.log(`   Body:`, data);
  });
})
  .on('error', (err) => {
    console.error(`❌ Error: ${err.message}`);
  })
  .write(body);
