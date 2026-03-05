/**
 * Debug Notification Service
 * ตรวจสอบว่า access token ถูกต้องหรือไม่
 */

require('dotenv').config();
const { LineNotificationService } = require('./services/line/lineNotificationService');

console.log('\n🔍 === Checking LINE Notification Service ===\n');

// ตรวจสอบ Account 1
console.log('📱 Account 1:');
console.log(`   Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ Found' : '❌ Not found'}`);
console.log(`   Token length: ${process.env.LINE_CHANNEL_ACCESS_TOKEN?.length || 0}`);

// ตรวจสอบ Account 2
console.log('\n📱 Account 2:');
console.log(`   Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN_2 ? '✅ Found' : '❌ Not found'}`);
console.log(`   Token length: ${process.env.LINE_CHANNEL_ACCESS_TOKEN_2?.length || 0}`);

// สร้าง service instances
const service1 = new LineNotificationService(1);
const service2 = new LineNotificationService(2);

console.log('\n📊 Service Instances:');
console.log(`   Service 1 has token: ${!!service1.accessToken}`);
console.log(`   Service 2 has token: ${!!service2.accessToken}`);

// ทดสอบส่งข้อความ
(async () => {
  console.log('\n🧪 Testing message send...\n');

  // ทดสอบส่งข้อความส่วนตัว
  const testUserId = 'Uc2a009fe53d51946657363bdbb7d1374'; // 💓Noon💓
  const testMessage = '🧪 Test message from debug script';

  console.log(`📤 Sending test message to ${testUserId}...`);
  const result = await service2.sendPrivateMessage(testUserId, testMessage);
  console.log(`   Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
  if (!result.success) {
    console.log(`   Error: ${result.error}`);
  }

  // ทดสอบส่งข้อความกลุ่ม
  const testGroupId = 'C4e522277480703e5eddbf658666ba6a9';
  const testGroupMessage = '🧪 Test group message from debug script';

  console.log(`\n📢 Sending test group message to ${testGroupId}...`);
  const groupResult = await service2.sendGroupMessage(testGroupId, testGroupMessage);
  console.log(`   Result: ${groupResult.success ? '✅ Success' : '❌ Failed'}`);
  if (!groupResult.success) {
    console.log(`   Error: ${groupResult.error}`);
  }
})();
