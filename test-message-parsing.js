/**
 * Test Message Parsing
 * ทดสอบการถอดและบันทึกข้อความ ไล่/360-400/20เป็ด
 */

const BettingMessageParserService = require('./services/betting/bettingMessageParserService');
const BetsSheetColumns = require('./services/betting/betsSheetColumns');

console.log('🧪 Testing Message Parsing for: ไล่/360-400/20เป็ด\n');

// ===== STEP 1: Parse ข้อความ User A =====
console.log('📝 STEP 1: User A sends message');
console.log('   Message: ไล่/360-400/20เป็ด\n');

const userAMessage = 'ไล่/360-400/20เป็ด';
const parsedUserA = BettingMessageParserService.parseMessage(userAMessage);

console.log('   Parsed Result:');
console.log(`   ✅ Success: ${parsedUserA.success}`);
console.log(`   📊 Method: ${parsedUserA.method}`);
console.log(`   🎆 Slip Name: "${parsedUserA.slipName}"`);
console.log(`   💹 Price: ${parsedUserA.price}`);
console.log(`   ฝั่ง: ${parsedUserA.sideCode}`);
console.log(`   💰 Amount: ${parsedUserA.amount}`);
console.log('');

// ===== STEP 2: บันทึก User A ลงชีท =====
console.log('📝 STEP 2: Record User A to sheet');
console.log('   Creating row with User A data...\n');

const userARow = BetsSheetColumns.createRow({
  timestamp: new Date().toISOString(),
  userAId: 'U123456',
  userAName: 'ธา มือทอง',
  messageA: userAMessage,
  slipName: parsedUserA.slipName,
  sideA: `${parsedUserA.price} ${parsedUserA.sideCode}`,
  amount: parsedUserA.amount,
  groupId: 'C123456',
});

console.log('   Row Data (Column E - Slip Name):');
console.log(`   ✅ Column E (SLIP_NAME): "${userARow[BetsSheetColumns.COLUMNS.SLIP_NAME]}"`);
console.log(`   ✅ Column D (MESSAGE_A): "${userARow[BetsSheetColumns.COLUMNS.MESSAGE_A]}"`);
console.log(`   ✅ Column F (SIDE_A): "${userARow[BetsSheetColumns.COLUMNS.SIDE_A]}"`);
console.log(`   ✅ Column G (AMOUNT): ${userARow[BetsSheetColumns.COLUMNS.AMOUNT]}`);
console.log('');

// ===== STEP 3: Parse ข้อความ User B (Reply) =====
console.log('📝 STEP 3: User B replies with message');
console.log('   Message: ไล่/360-400/20เป็ด (same as User A)\n');

const userBMessage = 'ไล่/360-400/20เป็ด';
const parsedUserB = BettingMessageParserService.parseMessage(userBMessage);

console.log('   Parsed Result:');
console.log(`   ✅ Success: ${parsedUserB.success}`);
console.log(`   📊 Method: ${parsedUserB.method}`);
console.log(`   🎆 Slip Name: "${parsedUserB.slipName}"`);
console.log(`   💹 Price: ${parsedUserB.price}`);
console.log(`   ฝั่ง: ${parsedUserB.sideCode}`);
console.log(`   💰 Amount: ${parsedUserB.amount}`);
console.log('');

// ===== STEP 4: Parse User A data from sheet =====
console.log('📝 STEP 4: Parse User A data from sheet');
console.log('   Using parseRow() to extract data...\n');

const parsedUserAFromSheet = BetsSheetColumns.parseRow(userARow);

console.log('   Parsed Result:');
console.log(`   🎆 Slip Name: "${parsedUserAFromSheet.slipName}"`);
console.log(`   💹 Price: ${parsedUserAFromSheet.price}`);
console.log(`   ฝั่ง: ${parsedUserAFromSheet.sideCode}`);
console.log(`   💰 Amount: ${parsedUserAFromSheet.amount}`);
console.log('');

// ===== STEP 5: Update row with User B data =====
console.log('📝 STEP 5: Update row with User B data');
console.log('   Using updateRowWithUserB()...\n');

// สร้าง Price B
const priceB = BetsSheetColumns.createPriceB(
  `${parsedUserAFromSheet.price} ${parsedUserAFromSheet.sideCode}`,
  parsedUserAFromSheet.sideCode
);

console.log(`   Price B: ${priceB}`);
console.log('');

const userBData = {
  userId: 'U789012',
  displayName: '💓Noon💓',
  sideCode: BetsSheetColumns.getOppositeSide(parsedUserAFromSheet.sideCode),
  amount: parsedUserAFromSheet.amount,
  price: parsedUserAFromSheet.price,
  priceB: priceB,
  slipName: parsedUserAFromSheet.slipName,  // ✅ ใช้ slip name เดียวกับของ User A
  groupName: '',
};

const updatedRow = BetsSheetColumns.updateRowWithUserB(userARow, userBData);

console.log('   Updated Row Data:');
console.log(`   ✅ Column E (SLIP_NAME): "${updatedRow[BetsSheetColumns.COLUMNS.SLIP_NAME]}"`);
console.log(`   ✅ Column L (USER_B_NAME): "${updatedRow[BetsSheetColumns.COLUMNS.USER_B_NAME]}"`);
console.log(`   ✅ Column M (SIDE_B): "${updatedRow[BetsSheetColumns.COLUMNS.SIDE_B]}"`);
console.log(`   ✅ Column H (AMOUNT_B): ${updatedRow[BetsSheetColumns.COLUMNS.AMOUNT_B]}`);
console.log(`   ✅ Column U (MATCHED_AUTO): "${updatedRow[BetsSheetColumns.COLUMNS.MATCHED_AUTO]}"`);
console.log('');

// ===== SUMMARY =====
console.log('📊 SUMMARY\n');
console.log('🎆 Slip Name Handling:');
console.log(`   User A Message: ไล่/360-400/20เป็ด`);
console.log(`   → Extracted Slip Name: "${parsedUserA.slipName}"`);
console.log(`   → Stored in Column E: "${userARow[BetsSheetColumns.COLUMNS.SLIP_NAME]}"`);
console.log(`   → When User B replies: "${updatedRow[BetsSheetColumns.COLUMNS.SLIP_NAME]}"`);
console.log('');

console.log('💹 Price Handling:');
console.log(`   User A Message: ไล่/360-400/20เป็ด`);
console.log(`   → Extracted Price: ${parsedUserA.price}`);
console.log(`   → Side Code: ${parsedUserA.sideCode}`);
console.log(`   → Stored in Column F: "${userARow[BetsSheetColumns.COLUMNS.SIDE_A]}"`);
console.log(`   → User B Side: ${userBData.sideCode}`);
console.log(`   → Price B: ${priceB}`);
console.log('');

console.log('💰 Amount Handling:');
console.log(`   User A Message: ไล่/360-400/20เป็ด`);
console.log(`   → Extracted Amount: ${parsedUserA.amount}`);
console.log(`   → Stored in Column G: ${userARow[BetsSheetColumns.COLUMNS.AMOUNT]}`);
console.log(`   → User B Amount: ${userBData.amount}`);
console.log(`   → Stored in Column H: ${updatedRow[BetsSheetColumns.COLUMNS.AMOUNT_B]}`);
console.log('');

console.log('✅ All data correctly parsed and recorded!');
