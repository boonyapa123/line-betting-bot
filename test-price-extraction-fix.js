/**
 * Test Price Extraction Fix
 * ทดสอบว่าการแยกช่วงราคาจากข้อความทำงานถูกต้อง
 */

console.log('🧪 Testing Price Extraction Fix\n');

// ฟังก์ชันแยกช่วงราคา (เหมือนใน index.js)
const extractPriceRange = (message) => {
  if (!message) return null;
  // ตรวจสอบรูปแบบ slash: [ฝั่ง]/[ราคา]/[ยอดเงิน][ชื่อบั้งไฟ] หรือ [ฝั่ง]/[ราคา]/[ยอดเงิน]/[ชื่อบั้งไฟ]
  let match = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (match) return match[1];
  
  // ตรวจสอบรูปแบบปกติ: [ราคา] [ล/ย] [ยอดเงิน] [ชื่อบั้งไฟ]
  match = message.match(/^(\d+[\-\.\/\*]\d+)/);
  if (match) return match[1];
  
  return null;
};

// Test cases
const testCases = [
  {
    message: 'ไล่/370-410/20เป็ด',
    expected: '370-410',
    description: 'Slash format without / before slip name'
  },
  {
    message: 'ไล่/370-400/50/เป็ด',
    expected: '370-400',
    description: 'Slash format with / before slip name'
  },
  {
    message: 'ไล่/360-400/20เป็ด',
    expected: '360-400',
    description: 'Slash format 360-400'
  },
  {
    message: '320-340 ล 100 คำไผ่',
    expected: '320-340',
    description: 'Standard format'
  },
  {
    message: 'ชล 500 ฟ้าหลังฝน',
    expected: null,
    description: 'Method 1 format (no price range)'
  },
  {
    message: '300-330 ล 500 ฟ้า',
    expected: '300-330',
    description: 'Standard format with different price'
  },
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = extractPriceRange(test.message);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${test.description}`);
  console.log(`   Message: "${test.message}"`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Got: ${result}\n`);
});

console.log('📊 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   Total: ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed!');
}
