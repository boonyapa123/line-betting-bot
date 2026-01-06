/**
 * Message Parsing Utilities
 */

import { MESSAGE_PATTERNS, ADMIN_COMMANDS } from '../config/constants';

/**
 * Parse betting message in format: [venue][amount]
 * Examples: "ต200", "ชล400", "เจ้าห้อม150"
 */
export const parseBettingMessage = (text: string): {
  isValid: boolean;
  venue?: string;
  amount?: number;
  error?: string;
} => {
  const cleanText = text.trim();

  const match = cleanText.match(MESSAGE_PATTERNS.BETTING);

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

  if (amount > 1000000) {
    return {
      isValid: false,
      error: 'Amount is too large',
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
export const parseVenueSelection = (text: string): {
  isValid: boolean;
  venue?: string;
  error?: string;
} => {
  const cleanText = text.trim().toLowerCase();

  // Check for "เลือกแทง" prefix
  if (cleanText.startsWith('เลือกแทง')) {
    const venue = cleanText.replace('เลือกแทง', '').trim();
    if (venue && venue.match(MESSAGE_PATTERNS.VENUE_SELECTION)) {
      return {
        isValid: true,
        venue,
      };
    }
  }

  // Check if it's just a venue name (Thai characters only)
  if (cleanText.match(MESSAGE_PATTERNS.VENUE_SELECTION)) {
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
 * Examples: "/สรุป", "/ผลแข่ง [venue] [fireNumber] [winners]"
 */
export const parseAdminCommand = (text: string): {
  isValid: boolean;
  command?: string;
  params?: string[];
  error?: string;
} => {
  const cleanText = text.trim();

  // Check if it starts with /
  if (!cleanText.startsWith('/')) {
    return {
      isValid: false,
      error: 'Admin command must start with /',
    };
  }

  // Split command and parameters
  const parts = cleanText.split(/\s+/);
  const command = parts[0].toLowerCase();
  const params = parts.slice(1);

  // Validate command
  const validCommands = Object.values(ADMIN_COMMANDS);
  if (!validCommands.includes(command)) {
    return {
      isValid: false,
      error: `Unknown command: ${command}`,
    };
  }

  return {
    isValid: true,
    command,
    params,
  };
};

/**
 * Parse result command parameters
 * Format: /ผลแข่ง [venue] [fireNumber] [winner1,winner2,...]
 */
export const parseResultCommand = (params: string[]): {
  isValid: boolean;
  venue?: string;
  fireNumber?: string;
  winners?: string[];
  error?: string;
} => {
  if (params.length < 3) {
    return {
      isValid: false,
      error: 'Format: /ผลแข่ง [venue] [fireNumber] [winner1,winner2,...]',
    };
  }

  const venue = params[0];
  const fireNumber = params[1];
  const winnersStr = params.slice(2).join(' ');
  const winners = winnersStr.split(',').map(w => w.trim());

  if (!venue || !fireNumber || winners.length === 0) {
    return {
      isValid: false,
      error: 'Missing required parameters',
    };
  }

  return {
    isValid: true,
    venue,
    fireNumber,
    winners,
  };
};

/**
 * Identify message type
 */
export const identifyMessageType = (text: string): {
  type: 'betting' | 'venue_selection' | 'admin_command' | 'unknown';
  data?: any;
} => {
  const cleanText = text.trim().toLowerCase();

  // Check for admin command
  if (cleanText.startsWith('/')) {
    const result = parseAdminCommand(text);
    if (result.isValid) {
      return {
        type: 'admin_command',
        data: result,
      };
    }
  }

  // Check for betting message
  const bettingResult = parseBettingMessage(text);
  if (bettingResult.isValid) {
    return {
      type: 'betting',
      data: bettingResult,
    };
  }

  // Check for venue selection
  const venueResult = parseVenueSelection(text);
  if (venueResult.isValid) {
    return {
      type: 'venue_selection',
      data: venueResult,
    };
  }

  return {
    type: 'unknown',
  };
};

/**
 * Validate betting amount
 */
export const validateBettingAmount = (amount: number): {
  isValid: boolean;
  error?: string;
} => {
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  if (!Number.isInteger(amount)) {
    return {
      isValid: false,
      error: 'Amount must be an integer',
    };
  }

  if (amount > 1000000) {
    return {
      isValid: false,
      error: 'Amount is too large (max: 1,000,000)',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Validate venue name
 */
export const validateVenueName = (venue: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!venue || venue.trim().length === 0) {
    return {
      isValid: false,
      error: 'Venue name cannot be empty',
    };
  }

  if (venue.length > 50) {
    return {
      isValid: false,
      error: 'Venue name is too long',
    };
  }

  return {
    isValid: true,
  };
};

/**
 * Validate fire number
 */
export const validateFireNumber = (fireNumber: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!fireNumber || fireNumber.trim().length === 0) {
    return {
      isValid: false,
      error: 'Fire number cannot be empty',
    };
  }

  if (fireNumber.length > 20) {
    return {
      isValid: false,
      error: 'Fire number is too long',
    };
  }

  return {
    isValid: true,
  };
};
