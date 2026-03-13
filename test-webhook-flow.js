/**
 * Test: ทดสอบการไหลของ webhook เมื่อประกาศผล
 */

require('dotenv').config();

const PriceRangeCalculator = require('./services/betting/priceRangeCalculator');

async function main() {
  try {
    console.log('📊 ทดสอบการไหลของ webhook\n');

    // ข้อมูลจากชีท
    const testCases = [
      {
        rowIndex: 2,
        userAName: 'paa"BOY"',
        userBName: 'นุช519',
        priceA: '300-320 ล 20 ฟ้า',
        resultNumber: 340,
      },
      {
        rowIndex: 3,
        userAName: 'paa"BOY"',
        userBName: 'นุช519',
        priceA: '300-340 ล 30 ฟ้า',
        resultNumber: 340,
      },
      {
        rowIndex: 4,
        userAName: '💓Noon💓',
        userBName: 'ธา  มือทอง',
        priceA: '310-320 ย 20 ฟ้า',
        resultNumber: 340,
      },
    ];

    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const testCase of testCases) {
      console.log(`Row ${testCase.rowIndex}: ${testCase.userAName} vs ${testCase.userBName}`);
      console.log(`ราคา: ${testCase.priceA}`);
      console.log(`ผลออก: ${testCase.resultNumber}\n`);

      // Step 1: Parse price range
      console.log('Step 1: Parse price range');
      const priceRange = PriceRangeCalculator.parsePriceRange(testCase.priceA);
      console.log(`  priceRange: ${JSON.stringify(priceRange)}\n`);

      // Step 2: Calculate result
      console.log('Step 2: Calculate result');
      const result = PriceRangeCalculator.calculateResult(testCase.resultNumber, priceRange);
      console.log(`  isDraw: ${result.isDraw}`);
      console.log(`  winner: ${result.winner}`);
      console.log(`  loser: ${result.loser}`);
      console.log(`  reason: ${result.reason}\n`);

      // Step 3: Get result symbols
      console.log('Step 3: Get result symbols');
      const symbols = PriceRangeCalculator.getResultSymbols(result);
      console.log(`  resultA: ${symbols.resultA}`);
      console.log(`  resultB: ${symbols.resultB}\n`);

      // Step 4: Simulate bettingResultService
      console.log('Step 4: Simulate bettingResultService');
      const pair = {
        bet1: {
          userId: 'userA123',
          displayName: testCase.userAName,
          userBName: testCase.userBName,
          userBId: 'userB456',
          amount: 20,
          price: testCase.priceA,
          side: 'ล',
          method: 2,
        },
        bet2: {
          userId: 'userB456',
          displayName: testCase.userBName,
          userBName: testCase.userAName,
          amount: 20,
          price: null,
          side: 'ล',
          method: 'REPLY',
        },
      };

      const bettingResultService = require('./services/betting/bettingResultService');
      const calculatedResult = bettingResultService.calculateResultWithFees(pair, 'ฟ้า', testCase.resultNumber);
      
      console.log(`  isDraw: ${calculatedResult.isDraw}`);
      console.log(`  winner: ${calculatedResult.winner?.displayName}`);
      console.log(`  loser: ${calculatedResult.loser?.displayName}`);
      console.log(`  winner fee: ${calculatedResult.winner?.fee}`);
      console.log(`  loser fee: ${calculatedResult.loser?.fee}\n`);

      // Step 5: Determine final result symbols
      console.log('Step 5: Determine final result symbols');
      let userAResultText = '';
      let userBResultText = '';

      if (calculatedResult.isDraw) {
        userAResultText = '⛔️';
        userBResultText = '⛔️';
      } else {
        if (calculatedResult.winner.userId === pair.bet1.userId) {
          userAResultText = '✅';
          userBResultText = '❌';
        } else {
          userAResultText = '❌';
          userBResultText = '✅';
        }
      }

      console.log(`  userAResultText: ${userAResultText}`);
      console.log(`  userBResultText: ${userBResultText}`);
      console.log(`  ✅ จะบันทึก: ${testCase.resultNumber} | ${userAResultText} | ${userBResultText}\n`);

      console.log('═══════════════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

main();
