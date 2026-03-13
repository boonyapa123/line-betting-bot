// Test new format: ไล่/350-390/10000แอดไล่

function extractBetType(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/^([ตยสล])\//);
  if (slashFormatMatch) {
    const typeChar = slashFormatMatch[1];
    const typeMap = {
      'ต': 'ต่ำ/ยั่ง',
      'ย': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
      'ล': 'สูง/ไล่'
    };
    const betType = typeMap[typeChar];
    console.log(`      ✅ Bet type (slash format): ${betType}`);
    return betType;
  }
  
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
    'ติด': 'ยั้ง',
    'สูง': 'สูง',
    'ต่ำ': 'ต่ำ',
    'ถ': 'ถอย',
    'ย': 'ยั้ง',
    'ล': 'สูง/ไล่',
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

function extractBetAmount(message) {
  if (!message) return null;
  
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/\/(\d+)(?:[ก-๙]|$)/);
  if (slashFormatMatch) {
    const amount = parseInt(slashFormatMatch[1]);
    if (amount >= 10) {
      console.log(`      ✅ Bet amount (slash format): ${amount}`);
      return amount;
    }
  }
  
  // รูปแบบใหม่: ต1000, ย1000, ส1000, ล1000
  const newFormatMatch = message.match(/[ตยสล](\d+)/);
  if (newFormatMatch) {
    const amount = parseInt(newFormatMatch[1]);
    if (amount >= 10) {
      console.log(`      ✅ Bet amount (new format): ${amount}`);
      return amount;
    }
  }
  
  // รูปแบบเดิม: Get all numbers
  const numbers = message.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  
  // Find last whole number >= 10
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = parseFloat(numbers[i]);
    if (Number.isInteger(num) && num >= 10) {
      console.log(`      ✅ Bet amount: ${num}`);
      return num;
    }
  }
  
  return null;
}

function extractPriceRange(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/\/(\d+[\-\.\/\*]\d+)\//);
  if (slashFormatMatch) {
    const priceRange = slashFormatMatch[1];
    console.log(`      ✅ Price range (slash format): ${priceRange}`);
    return priceRange;
  }
  
  // แยกช่วงราคา เช่น 360-410, 370-410
  const priceRangeMatch = message.match(/(\d+[\-\.\/\*]\d+)/);
  if (priceRangeMatch) {
    const priceRange = priceRangeMatch[1];
    console.log(`      ✅ Price range: ${priceRange}`);
    return priceRange;
  }
  
  console.log(`      ❌ No price range found`);
  return null;
}

function extractFireworkName(message) {
  // รูปแบบใหม่: ไล่/350-390/10000แอดไล่
  const slashFormatMatch = message.match(/\/\d+([ก-๙]+)$/);
  if (slashFormatMatch) {
    const fireworkName = slashFormatMatch[1];
    console.log(`      ✅ Firework name (slash format): ${fireworkName}`);
    return fireworkName;
  }
  
  // แยกข้อความเป็นคำ
  const words = message.split(/\s+/);
  
  const betTypes = ['ถอย', 'ยั้ง', 'ล่าง', 'บน', 'ชล', 'ชถ', 'สกัด', 'ต่ำ', 'สูง', 'ไล่', '✅', '❌', 'ต', 'ย', 'ส', 'ล'];
  
  // ค้นหาคำที่ไม่ใช่ตัวเลข ไม่ใช่ประเภทเดิมพัน และไม่ใช่ตัวเลขผสม
  for (const word of words) {
    // ข้ามคำที่เป็นตัวเลขเพียงอย่างเดียว
    if (/^\d+$/.test(word)) continue;
    
    // ข้ามคำที่เป็นตัวเลขผสมตัวคั่น (เช่น 370-410, 310.5)
    if (/^\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*$/.test(word)) continue;
    
    // ข้ามคำที่มีตัวเลขผสมกับข้อความ (เช่น "ชถ500ฟ้า", "ชล100แอด")
    if (/\d/.test(word)) continue;
    
    // ข้ามคำที่เป็นประเภทเดิมพัน
    if (betTypes.includes(word)) continue;
    
    // ถ้าเหลือคำ ให้ใช้เป็นชื่อบั้งไฟ
    if (word.length > 0) {
      console.log(`      ✅ Firework name (text): ${word}`);
      return word;
    }
  }
  
  console.log(`      ❌ No firework name found`);
  return null;
}

// Test cases
const testMessages = [
  'ไล่/350-390/10000แอดไล่',
  'ต/360-410/5000แอดต',
  'ย/370-400/8000แอดย',
  'ส/380-420/12000แอดส',
  'ล1000',
  'ต1000',
  '370-410 ล 20 แอด',
  '360-410 ย 15 ชล',
];

console.log('🧪 Testing new format parsing:\n');

testMessages.forEach((msg) => {
  console.log(`\n📝 Message: "${msg}"`);
  console.log(`   Type: ${extractBetType(msg)}`);
  console.log(`   Amount: ${extractBetAmount(msg)}`);
  console.log(`   Price Range: ${extractPriceRange(msg)}`);
  console.log(`   Firework Name: ${extractFireworkName(msg)}`);
});
