// Test extractBetType function

function extractBetType(message) {
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/([ตยสล])(\d+)/);
  if (newFormatMatch) {
    const typeChar = newFormatMatch[1];
    const typeMap = {
      'ต': 'ต่ำ/ยั่ง',
      'ย': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
      'ล': 'สูง/ไล่'
    };
    const betType = typeMap[typeChar];
    console.log(`      ✅ Bet type (new format): ${betType}`);
    return betType;
  }
  
  // รูปแบบเดิม
  const betTypes = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ชล': 'ชล',
    'ชถ': 'ชล',
    'สกัด': 'สกัด',
    'ติด': 'ยั้ง', // "ติด" = ยั้ง
    'สูง': 'สูง',
    'ต่ำ': 'ต่ำ',
    'ถ': 'ถอย',
    'ย': 'ยั้ง',
    'ล': 'ล่าง',
    'บ': 'บน',
  };
  
  for (const [key, value] of Object.entries(betTypes)) {
    if (message.includes(key)) {
      console.log(`      ✅ Bet type: ${value}`);
      return value;
    }
  }
  
  console.log(`      ❌ No bet type found`);
  return null;
}

// Test messages
const testMessages = [
  '360-400 ย 20 แอด',
  'ต1000',
  'ย1000',
  'ล1000',
  'ส1000',
  'ถอย 100',
  'ยั้ง 100',
  'ล่าง 100',
  'บน 100',
  'ชล 100',
  'ชถ 100',
];

console.log('🧪 Testing extractBetType function:\n');

testMessages.forEach((msg) => {
  console.log(`Message: "${msg}"`);
  const result = extractBetType(msg);
  console.log(`Result: ${result}\n`);
});
