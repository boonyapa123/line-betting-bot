/**
 * Parse betting message in format: [venue][amount]
 * Examples: "ต200", "ชล400", "เจ้าห้อม150"
 */

const parseBettingMessage = (text) => {
  // Remove whitespace and newlines
  const cleanText = text.trim();

  // Regex pattern: Thai characters followed by digits
  // Thai Unicode range: \u0E00-\u0E7F
  const pattern = /^([\u0E00-\u0E7F]+)(\d+)$/;
  const match = cleanText.match(pattern);

  if (!match) {
    return {
      isValid: false,
      error: 'Invalid format. Use: [venue][amount] (e.g., ต200, ชล400)',
    };
  }

  const venue = match[1];
  const amount = parseInt(match[2], 10);

  // Validate amount
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  return {
    isValid: true,
    venue,
    amount,
  };
};

/**
 * Parse venue selection message
 * Examples: "เลือกแทงต", "ต", "ชล"
 */
const parseVenueSelection = (text) => {
  const cleanText = text.trim().toLowerCase();

  // Check for "เลือกแทง" prefix
  if (cleanText.startsWith('เลือกแทง')) {
    const venue = cleanText.replace('เลือกแทง', '').trim();
    if (venue) {
      return {
        isValid: true,
        venue,
      };
    }
  }

  // Check if it's just a venue name (Thai characters only)
  const venuePattern = /^([\u0E00-\u0E7F]+)$/;
  if (venuePattern.test(cleanText)) {
    return {
      isValid: true,
      venue: cleanText,
    };
  }

  return {
    isValid: false,
    error: 'Invalid venue selection format',
  };
};

/**
 * Parse admin command
 * Examples: "ปิดรอบ", "ประกาศผู้ชนะ", "เพิ่มสนาม"
 */
const parseAdminCommand = (text) => {
  const cleanText = text.trim();

  // Command patterns
  const commands = {
    closeRound: ['ปิดรอบ', 'close round'],
    setWinner: ['ประกาศผู้ชนะ', 'set winner'],
    addVenue: ['เพิ่มสนาม', 'add venue'],
    listVenues: ['รายชื่อสนาม', 'list venues'],
    getReport: ['รายงาน', 'report'],
  };

  for (const [command, keywords] of Object.entries(commands)) {
    if (keywords.some((kw) => cleanText.includes(kw))) {
      return {
        isValid: true,
        command,
        text: cleanText,
      };
    }
  }

  return {
    isValid: false,
    error: 'Unknown command',
  };
};

module.exports = {
  parseBettingMessage,
  parseVenueSelection,
  parseAdminCommand,
};
