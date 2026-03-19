/**
 * PriceRangeCalculator
 * ตรวจสอบผลลัพธ์สำหรับการเล่นร้องช่วงราคา
 * 
 * กฎการคำนวณ:
 * 1. ผลออกในช่วง (300-340) → เสมอ (⛔️)
 * 2. ผลต่ำกว่าช่วง + ฝ่าย ย → ย ชนะ (✅)
 * 3. ผลสูงกว่าช่วง + ฝ่าย ล → ล ชนะ (✅)
 */

class PriceRangeCalculator {
  /**
   * แยก price range จากข้อความ
   * @param {string} priceStr - ข้อความราคา เช่น "300-340 ล 30"
   * @returns {object|null} { min, max, side } หรือ null ถ้าไม่มี price range
   */
  static parsePriceRange(priceStr) {
    if (!priceStr) return null;

    // รองรับทั้งแบบมี side code (370-400 ล) และไม่มี (370-400)
    const matchWithSide = priceStr.match(/(\d+)-(\d+)\s+([ยล])/);
    if (matchWithSide) {
      return {
        min: parseInt(matchWithSide[1]),
        max: parseInt(matchWithSide[2]),
        side: matchWithSide[3], // ย = ต่ำ, ล = สูง
      };
    }

    // แบบไม่มี side code - parse เฉพาะช่วงราคา
    const matchRange = priceStr.match(/(\d+)-(\d+)/);
    if (!matchRange) return null;

    return {
      min: parseInt(matchRange[1]),
      max: parseInt(matchRange[2]),
      side: null,
    };
  }

  /**
   * ตรวจสอบว่าผลที่ออกอยู่ในช่วงราคาหรือไม่
   * @param {number} resultNumber - ผลที่ออก
   * @param {object} priceRange - { min, max, side }
   * @returns {object} { isDraw, winner, loser, reason }
   */
  static calculateResult(resultNumber, priceRange) {
    if (!priceRange) return null;

    const { min, max, side } = priceRange;

    // กฎ 1: ผลออกในช่วง → เสมอ
    if (resultNumber >= min && resultNumber <= max) {
      return {
        isDraw: true,
        winner: null,
        loser: null,
        reason: `ผลออก ${resultNumber} อยู่ในช่วง ${min}-${max} → เสมอ`,
      };
    }

    // กฎ 2: ผลต่ำกว่าช่วง
    if (resultNumber < min) {
      if (side === 'ย') {
        // ฝ่าย ย (ต่ำ) ชนะ
        return {
          isDraw: false,
          winner: 'A', // ผู้เล่น A ชนะ
          loser: 'B',
          reason: `ผลออก ${resultNumber} ต่ำกว่าช่วง ${min}-${max} + ฝ่าย ย → ย ชนะ`,
        };
      } else {
        // ฝ่าย ล (สูง) แพ้
        return {
          isDraw: false,
          winner: 'B', // ผู้เล่น B ชนะ
          loser: 'A',
          reason: `ผลออก ${resultNumber} ต่ำกว่าช่วง ${min}-${max} + ฝ่าย ล → ล แพ้`,
        };
      }
    }

    // กฎ 3: ผลสูงกว่าช่วง
    if (resultNumber > max) {
      if (side === 'ล') {
        // ฝ่าย ล (สูง) ชนะ
        return {
          isDraw: false,
          winner: 'A', // ผู้เล่น A ชนะ
          loser: 'B',
          reason: `ผลออก ${resultNumber} สูงกว่าช่วง ${min}-${max} + ฝ่าย ล → ล ชนะ`,
        };
      } else {
        // ฝ่าย ย (ต่ำ) แพ้
        return {
          isDraw: false,
          winner: 'B', // ผู้เล่น B ชนะ
          loser: 'A',
          reason: `ผลออก ${resultNumber} สูงกว่าช่วง ${min}-${max} + ฝ่าย ย → ย แพ้`,
        };
      }
    }

    return null;
  }

  /**
   * แปลง winner/loser เป็น result symbol
   * @param {object} result - { isDraw, winner, loser }
   * @returns {object} { resultA, resultB }
   */
  static getResultSymbols(result) {
    if (!result) return null;

    if (result.isDraw) {
      return {
        resultA: '⛔️',
        resultB: '⛔️',
      };
    }

    if (result.winner === 'A') {
      return {
        resultA: '✅',
        resultB: '❌',
      };
    } else {
      return {
        resultA: '❌',
        resultB: '✅',
      };
    }
  }
}

module.exports = PriceRangeCalculator;
