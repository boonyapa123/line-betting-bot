/**
 * Parser for extracting bet details from Thai lottery messages
 * Handles various formats and abbreviations
 * 
 * Strategy: Use simple regex patterns to extract data:
 * 1. Extract bet amount (ยอดเงิน) - last whole number
 * 2. Extract bet type (รายการเล่น) - first bet type found
 * 3. Extract firework name (ชื่อบั้งไฟ) - first number with separators or before bet type
 */
export class BetParser {
  // Bet types mapping (รายการเล่น)
  private static readonly BET_TYPE_MAP: { [key: string]: string } = {
    'ถอย': 'ถอย',
    'ยั้ง': 'ยั้ง',
    'ล่าง': 'ล่าง',
    'บน': 'บน',
    'ลบ': 'ลบ',
    'ถ': 'ถอย',
    'ย': 'ยั้ง',
    'บ': 'บน',
    'ล': 'ล่าง',
    'ชถ': 'ชล',
    'ชล': 'ชล',
    'สกัด': 'สกัด',
  };

  /**
   * Extract all bet details from message
   */
  public static extractBetDetails(message: string): {
    fireworkName: string | null;
    betType: string | null;
    betAmount: number | null;
    result: string | null;
  } {
    return {
      fireworkName: this.extractFireworkName(message),
      betType: this.extractBetType(message),
      betAmount: this.extractBetAmount(message),
      result: this.extractResult(message),
    };
  }

  /**
   * Extract bet amount (ยอดเงิน) - number associated with bet type
   * Strategy: 
   * 1. First, look for numbers directly after bet types (e.g., "ชล 500", "ถ500")
   * 2. Prefer whole numbers over decimals (decimals are likely firework names)
   * 3. If multiple numbers found after bet types, use the LARGEST one
   * 4. Fallback: Use the LAST whole number >= 10 if no bet type match found
   * 
   * This handles both formats:
   * - "ชล 500 อ้วนส.กาวเดือน 295-108-1" -> 500 (after bet type)
   * - "อ้วนถอย80.05ล.มะปราง500" -> 500 (last whole number, since 80.05 is firework name)
   */
  public static extractBetAmount(message: string): number | null {
    if (!message) return null;

    // Priority 1: Look for numbers directly after bet types
    const betTypes = Object.keys(this.BET_TYPE_MAP).sort((a, b) => b.length - a.length);
    const amountsAfterBetType: number[] = [];
    
    for (const betType of betTypes) {
      // Match: bet type followed by optional space and then a number
      const escapedBetType = betType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${escapedBetType}\\s*(\\d+(?:\\.\\d+)?)`);
      const match = message.match(pattern);
      
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        // Prefer whole numbers (bet amounts are typically whole numbers)
        // Decimals are likely firework names (e.g., 80.05, 9/1)
        const isWholeNumber = Number.isInteger(amount);
        
        if (!isNaN(amount) && amount >= 10 && isWholeNumber) {
          amountsAfterBetType.push(amount);
        }
      }
    }

    // If we found valid amounts after bet types, return the LARGEST one
    if (amountsAfterBetType.length > 0) {
      const maxAmount = Math.max(...amountsAfterBetType);
      console.log(`      ✅ Bet amount (after bet type, whole number): ${maxAmount}`);
      return maxAmount;
    }

    // Priority 2: Fallback - get the LAST whole number >= 10
    const numbers = message.match(/\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length === 0) return null;

    // Find the last whole number that's >= 10 (likely to be the bet amount)
    for (let i = numbers.length - 1; i >= 0; i--) {
      const num = parseFloat(numbers[i]);
      const isWholeNumber = Number.isInteger(num);
      
      if (!isNaN(num) && num >= 10 && isWholeNumber) {
        console.log(`      ✅ Bet amount (last whole number >= 10): ${num}`);
        return num;
      }
    }

    // If no whole number >= 10 found, just return the last number
    const lastNumber = parseFloat(numbers[numbers.length - 1]);
    if (!isNaN(lastNumber) && lastNumber > 0) {
      console.log(`      ✅ Bet amount (last number): ${lastNumber}`);
      return lastNumber;
    }

    return null;
  }

  /**
   * Extract bet type (รายการเล่น) - FIRST bet type found
   * Checks all known bet types and returns the first match
   */
  public static extractBetType(message: string): string | null {
    if (!message) return null;

    // Sort by length (longest first) to match longer patterns first
    const betTypes = Object.keys(this.BET_TYPE_MAP).sort((a, b) => b.length - a.length);

    for (const betType of betTypes) {
      if (message.includes(betType)) {
        const mapped = this.BET_TYPE_MAP[betType];
        console.log(`      ✅ Bet type: ${mapped}`);
        return mapped;
      }
    }

    console.log(`      ❌ No bet type found`);
    return null;
  }

  /**
   * Extract firework name (ชื่อบั้งไฟ) - FIRST number with separators or before bet type
   * Firework names typically have patterns like: 80.05, 9/1, 90*15, 295-108-1
   */
  public static extractFireworkName(message: string): string | null {
    if (!message) return null;

    // Priority 1: Look for numbers with separators (., /, *, -)
    // These are most likely to be firework names
    const withSeparator = message.match(/\d+[.\/*\-]\d+(?:[.\/*\-]\d+)*/);
    if (withSeparator) {
      console.log(`      ✅ Firework name: ${withSeparator[0]}`);
      return withSeparator[0];
    }

    // Priority 2: Look for first number before any bet type
    const betTypes = Object.keys(this.BET_TYPE_MAP).sort((a, b) => b.length - a.length);
    let firstBetTypePos = message.length;

    for (const betType of betTypes) {
      const pos = message.indexOf(betType);
      if (pos !== -1 && pos < firstBetTypePos) {
        firstBetTypePos = pos;
      }
    }

    const beforeBetType = message.substring(0, firstBetTypePos);
    const firstNumber = beforeBetType.match(/\d+/);
    
    if (firstNumber) {
      console.log(`      ✅ Firework name: ${firstNumber[0]}`);
      return firstNumber[0];
    }

    console.log(`      ❌ No firework name found`);
    return null;
  }

  /**
   * Extract lottery number (if present)
   * e.g., "10009/1" → "10009"
   */
  public static extractLotteryNumber(message: string): string | null {
    if (!message) return null;

    const pattern = /(\d{4,6})(?:\/\d)?/;
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * Extract result (ผลแพ้ชนะ)
   * Looks for keywords like "ชนะ", "แพ้", "ถูก", "ผิด"
   */
  public static extractResult(message: string): string | null {
    if (!message) return null;

    // Check for win keywords
    if (message.includes('ชนะ') || message.includes('ถูก') || message.includes('✓')) {
      return 'ชนะ';
    }

    // Check for loss keywords
    if (message.includes('แพ้') || message.includes('ผิด') || message.includes('✗')) {
      return 'แพ้';
    }

    return null;
  }
}
