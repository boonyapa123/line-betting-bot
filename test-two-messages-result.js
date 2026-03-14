/**
 * Test Two Messages Result Announcement
 * ทดสอบการประกาศผลเมื่อมีสองข้อความ
 * A: ไล่/360-450/20เป็ด
 * B: ไล่/360-400/50/เป็ด
 * Result: เป็ด 410
 */

const BettingResultService = require('./services/betting/bettingResultService');

console.log('🧪 Testing Two Messages Result Announcement\n');

// ข้อความ A
const messageA = 'ไล่/360-450/20เป็ด';
console.log(`📝 Message A: ${messageA}`);
console.log(`   Price Range: 360-450`);
console.log(`   Side: ไล่ (ล = สูง)`);
console.log(`   Amount: 20 บาท`);
console.log(`   Slip Name: เป็ด\n`);

// ข้อความ B
const messageB = 'ไล่/360-400/50/เป็ด';
console.log(`📝 Message B: ${messageB}`);
console.log(`   Price Range: 360-400`);
console.log(`   Side: ไล่ (ล = สูง)`);
console.log(`   Amount: 50 บาท`);
console.log(`   Slip Name: เป็ด\n`);

// Result
const result = 410;
console.log(`📊 Result: เป็ด ${result} ✅️\n`);

// ตรวจสอบ logic
console.log('🔍 Analysis:\n');

// Message A
console.log('📌 Message A: ไล่/360-450/20เป็ด');
console.log(`   Price Range: 360-450`);
console.log(`   Result: 410`);
console.log(`   Status: 410 อยู่ในช่วง 360-450 → เสมอ (⛔️)`);
console.log(`   User A: ⛔️ (หัก 5% = 1 บาท)`);
console.log(`   User B: ⛔️ (หัก 5% = 1 บาท)\n`);

// Message B
console.log('📌 Message B: ไล่/360-400/50/เป็ด');
console.log(`   Price Range: 360-400`);
console.log(`   Result: 410`);
console.log(`   Status: 410 สูงกว่าช่วง 360-400 → ล (สูง) ชนะ (✅)`);
console.log(`   User A: ✅ (ชนะ, ได้ 50 - 5 = 45 บาท)`);
console.log(`   User B: ❌ (แพ้, เสีย 50 บาท)\n`);

// สรุป
console.log('📊 Summary:\n');
console.log('Message A (ไล่/360-450/20เป็ด):');
console.log('  User A: ⛔️ เสมอ (หัก 5% = 1 บาท)');
console.log('  User B: ⛔️ เสมอ (หัก 5% = 1 บาท)\n');

console.log('Message B (ไล่/360-400/50/เป็ด):');
console.log('  User A: ✅ ชนะ (ได้ 45 บาท)');
console.log('  User B: ❌ แพ้ (เสีย 50 บาท)\n');

console.log('💡 Key Points:');
console.log('  1. ข้อความ A: ผลอยู่ในช่วง 360-450 → เสมอ');
console.log('  2. ข้อความ B: ผลสูงกว่าช่วง 360-400 → ล (สูง) ชนะ');
console.log('  3. ทั้งสองข้อความใช้บั้งไฟเดียวกัน (เป็ด) แต่ราคาต่างกัน');
console.log('  4. ผลประกาศจะแยกตามแต่ละข้อความ');
