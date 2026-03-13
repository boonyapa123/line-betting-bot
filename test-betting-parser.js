// Test BettingMessageParserService with new format

class BettingMessageParserService {
  static METHOD1_PATTERN = /^(.+?)\s+(ชล\.|ชถ\.)\s+(\d+)$/;
  static METHOD1_ALT_PATTERN = /^(ชล|ชถ|ชย)\s+(\d+)\s+(.+)$/;

  static METHOD2_PATTERN = /^(.+?)\s+([ลย]\.)\s+(\d+)\s+(.+)$/;
  static METHOD2_ALT_PATTERN = /^(.+?)\s+([ลย])\s+(\d+)\s+(.+)$/;
  static METHOD2_SIMPLE_PATTERN = /^(\d+-\d+)\s+([ลย])\s+(\d+)\s+(.+)$/;
  static METHOD2_SLASH_PATTERN = /^([ตยสลไถ][ก-๙]*)\/(\d+[\-\.\/\*]\d+)\/(\d+)([ก-๙]+)$/;

  static parseMessage(message) {
    const trimmedMessage = message.trim();

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบ Slash ใหม่
    const method2SlashMatch = trimmedMessage.match(this.METHOD2_SLASH_PATTERN);
    if (method2SlashMatch) {
      return this.parseMethod2Slash(method2SlashMatch);
    }

    // ตรวจสอบวิธีที่ 1 (ราคาช่าง) - รูปแบบเดิม
    const method1Match = trimmedMessage.match(this.METHOD1_PATTERN);
    if (method1Match) {
      return this.parseMethod1(method1Match);
    }

    // ตรวจสอบวิธีที่ 1 (ราคาช่าง) - รูปแบบใหม่
    const method1AltMatch = trimmedMessage.match(this.METHOD1_ALT_PATTERN);
    if (method1AltMatch) {
      return this.parseMethod1Alt(method1AltMatch);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบเดิม
    const method2Match = trimmedMessage.match(this.METHOD2_PATTERN);
    if (method2Match) {
      return this.parseMethod2(method2Match);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบใหม่
    const method2AltMatch = trimmedMessage.match(this.METHOD2_ALT_PATTERN);
    if (method2AltMatch) {
      return this.parseMethod2Alt(method2AltMatch);
    }

    // ตรวจสอบวิธีที่ 2 (ราคาคะแนน) - รูปแบบง่าย
    const method2SimpleMatch = trimmedMessage.match(this.METHOD2_SIMPLE_PATTERN);
    if (method2SimpleMatch) {
      return this.parseMethod2Simple(method2SimpleMatch);
    }

    // ไม่ตรงรูปแบบ
    return {
      success: false,
      method: null,
      error: 'รูปแบบผิดครับ กรุณาตรวจสอบการเว้นวรรค',
      hint: this.getHint(trimmedMessage),
    };
  }

  static parseMethod1(match) {
    const [, slipName, side, amount] = match;
    return {
      success: true,
      method: 1,
      slipName: slipName.trim(),
      side: side === 'ชล.' ? 'ไล่' : 'ถอย',
      sideCode: side === 'ชล.' ? 'ชล' : 'ชถ',
      amount: parseInt(amount),
      price: null,
      timestamp: new Date().toISOString(),
    };
  }

  static parseMethod1Alt(match) {
    const [, side, amount, slipName] = match;
    const sideMap = {
      'ชล': 'ไล่',
      'ชถ': 'ถอย',
      'ชย': 'ยั้ง',
    };
    return {
      success: true,
      method: 1,
      slipName: slipName.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      price: null,
      timestamp: new Date().toISOString(),
    };
  }

  static parseMethod2(match) {
    const [, price, side, amount, slipName] = match;
    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: side === 'ล.' ? 'ไล่' : 'ยั้ง',
      sideCode: side === 'ล.' ? 'ล' : 'ย',
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  static parseMethod2Alt(match) {
    const [, price, side, amount, slipName] = match;
    const sideMap = {
      'ล': 'ไล่',
      'ย': 'ยั้ง',
    };
    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  static parseMethod2Simple(match) {
    const [, price, side, amount, slipName] = match;
    const sideMap = {
      'ล': 'ไล่',
      'ย': 'ยั้ง',
    };
    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: side,
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  static parseMethod2Slash(match) {
    const [, side, price, amount, slipName] = match;
    const sideMap = {
      'ล': 'ไล่',
      'ไล่': 'ไล่',
      'ย': 'ยั้ง',
      'ต': 'ต่ำ/ยั่ง',
      'ส': 'สูง/ไล่',
    };
    const sideCodeMap = {
      'ล': 'ล',
      'ไล่': 'ล',
      'ย': 'ย',
      'ต': 'ต',
      'ส': 'ส',
    };
    return {
      success: true,
      method: 2,
      price: price.trim(),
      side: sideMap[side] || side,
      sideCode: sideCodeMap[side] || side,
      amount: parseInt(amount),
      slipName: slipName.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  static getHint(message) {
    if (message.includes('ชล') || message.includes('ชถ')) {
      return 'วิธีที่ 1: [ชื่อบั้งไฟ] [ชล./ชถ.] [ยอดเงิน]\nตัวอย่าง: ฟ้าหลังฝน ชล. 500';
    }
    if (message.includes('ล') || message.includes('ย') || message.includes('ต') || message.includes('ส')) {
      return 'วิธีที่ 2: [ราคา] [ล./ย.] [ยอดเงิน] [ชื่อบั้งไฟ]\nตัวอย่าง: 0/3(300-330) ล. 500 ฟ้าหลังฝน\nหรือ: 300-330 ล 500 ฟ้าหลังฝน\nหรือ: ล/350-390/10000แอดไล่';
    }
    return 'กรุณาใช้รูปแบบใดรูปแบบหนึ่ง:\nวิธีที่ 1: ฟ้าหลังฝน ชล. 500\nวิธีที่ 2: 0/3(300-330) ล. 500 ฟ้าหลังฝน\nหรือ: 300-330 ล 500 ฟ้าหลังฝน\nหรือ: ล/350-390/10000แอดไล่';
  }
}

// Test cases
const testMessages = [
  'ไล่/350-390/10000แอดไล่',
  'ต/360-410/5000แอดต',
  'ย/370-400/8000แอดย',
  'ส/380-420/12000แอดส',
  'ฟ้าหลังฝน ชล. 500',
  'ชล 500 ฟ้าหลังฝน',
  '0/3(300-330) ล. 500 ฟ้าหลังฝน',
  '300-330 ล 500 ฟ้าหลังฝน',
];

console.log('🧪 Testing BettingMessageParserService:\n');

testMessages.forEach((msg) => {
  console.log(`\n📝 Message: "${msg}"`);
  const result = BettingMessageParserService.parseMessage(msg);
  
  if (result.success) {
    console.log(`   ✅ Success`);
    console.log(`      Method: ${result.method}`);
    console.log(`      Side: ${result.side} (${result.sideCode})`);
    console.log(`      Amount: ${result.amount}`);
    console.log(`      Price: ${result.price || 'N/A'}`);
    console.log(`      Slip Name: ${result.slipName}`);
  } else {
    console.log(`   ❌ Failed: ${result.error}`);
    console.log(`      Hint: ${result.hint}`);
  }
});
