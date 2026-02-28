const https = require('https');
const fs = require('fs');
const path = require('path');

// ข้อมูล
const API_URL = 'https://line-betting-bot.onrender.com/api/slip/verify';

// สร้าง test payload
const testPayload = {
  checkDuplicate: true,
  checkReceiver: JSON.stringify([
    {
      accountType: '01002', // ธนาคารกรุงเทพ
      accountNameTH: 'บริษัท สลิปทูโก จำกัด',
    },
  ]),
  checkAmount: JSON.stringify({
    type: 'gte',
    amount: '1000',
  }),
};

console.log('📤 ส่ง test API request...');
console.log(`   URL: ${API_URL}`);
console.log(`   Payload:`, testPayload);

// ถ้ามีไฟล์สลิป ให้ใช้ไฟล์นั้น
const slipImagePath = process.argv[2] || './slip.jpg';

if (!fs.existsSync(slipImagePath)) {
  console.error(`❌ ไฟล์ไม่พบ: ${slipImagePath}`);
  console.log(`\nวิธีใช้: node test-slip-api.js <path-to-slip-image>`);
  process.exit(1);
}

const imageBuffer = fs.readFileSync(slipImagePath);
console.log(`   📸 ไฟล์: ${slipImagePath} (${imageBuffer.length} bytes)`);

// สร้าง multipart form data
const boundary = '----FormBoundary' + Date.now();
let body = '';

// เพิ่ม checkDuplicate
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="checkDuplicate"\r\n\r\n`;
body += `${testPayload.checkDuplicate}\r\n`;

// เพิ่ม checkReceiver
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="checkReceiver"\r\n\r\n`;
body += `${testPayload.checkReceiver}\r\n`;

// เพิ่ม checkAmount
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="checkAmount"\r\n\r\n`;
body += `${testPayload.checkAmount}\r\n`;

// เพิ่มไฟล์
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="file"; filename="slip.jpg"\r\n`;
body += `Content-Type: image/jpeg\r\n\r\n`;

const bodyBuffer = Buffer.concat([
  Buffer.from(body),
  imageBuffer,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

const url = new URL(API_URL);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': bodyBuffer.length,
  },
};

https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log(`\n✅ Response: ${res.statusCode}`);
    try {
      const result = JSON.parse(data);
      console.log(`   Body:`, JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(`   Body:`, data);
    }
  });
})
  .on('error', (err) => {
    console.error(`❌ Error: ${err.message}`);
  })
  .write(bodyBuffer);
