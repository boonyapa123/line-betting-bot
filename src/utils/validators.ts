/**
 * Input Validation Utilities
 */

export class Validators {
  /**
   * Validate betting amount
   */
  static validateBettingAmount(amount: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if it's a number
    if (typeof amount !== 'number' && isNaN(Number(amount))) {
      return {
        isValid: false,
        error: 'ยอดเงินต้องเป็นตัวเลข',
      };
    }

    const numAmount = Number(amount);

    // Check if positive
    if (numAmount <= 0) {
      return {
        isValid: false,
        error: 'ยอดเงินต้องมากกว่า 0',
      };
    }

    // Check if integer
    if (!Number.isInteger(numAmount)) {
      return {
        isValid: false,
        error: 'ยอดเงินต้องเป็นจำนวนเต็ม',
      };
    }

    // Check max limit
    if (numAmount > 1000000) {
      return {
        isValid: false,
        error: 'ยอดเงินเกินขีดจำกัด (สูงสุด 1,000,000)',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate venue name
   */
  static validateVenueName(venue: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof venue !== 'string') {
      return {
        isValid: false,
        error: 'ชื่อสนามต้องเป็นข้อความ',
      };
    }

    const trimmed = venue.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'ชื่อสนามไม่สามารถว่างได้',
      };
    }

    // Check length
    if (trimmed.length > 50) {
      return {
        isValid: false,
        error: 'ชื่อสนามยาวเกินไป (สูงสุด 50 ตัวอักษร)',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate fire number
   */
  static validateFireNumber(fireNumber: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof fireNumber !== 'string') {
      return {
        isValid: false,
        error: 'หมายเลขบั้งไฟต้องเป็นข้อความ',
      };
    }

    const trimmed = fireNumber.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'หมายเลขบั้งไฟไม่สามารถว่างได้',
      };
    }

    // Check length
    if (trimmed.length > 20) {
      return {
        isValid: false,
        error: 'หมายเลขบั้งไฟยาวเกินไป (สูงสุด 20 ตัวอักษร)',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate user ID
   */
  static validateUserId(userId: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof userId !== 'string') {
      return {
        isValid: false,
        error: 'User ID ต้องเป็นข้อความ',
      };
    }

    // Check if empty
    if (userId.trim().length === 0) {
      return {
        isValid: false,
        error: 'User ID ไม่สามารถว่างได้',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate group ID
   */
  static validateGroupId(groupId: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof groupId !== 'string') {
      return {
        isValid: false,
        error: 'Group ID ต้องเป็นข้อความ',
      };
    }

    // Check if empty
    if (groupId.trim().length === 0) {
      return {
        isValid: false,
        error: 'Group ID ไม่สามารถว่างได้',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate URL
   */
  static validateUrl(url: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL ต้องเป็นข้อความ',
      };
    }

    // Check if empty
    if (url.trim().length === 0) {
      return {
        isValid: false,
        error: 'URL ไม่สามารถว่างได้',
      };
    }

    // Check if valid URL format
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: 'URL ไม่ถูกต้อง',
      };
    }
  }

  /**
   * Validate line name
   */
  static validateLineName(lineName: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if string
    if (typeof lineName !== 'string') {
      return {
        isValid: false,
        error: 'ชื่อ LINE ต้องเป็นข้อความ',
      };
    }

    const trimmed = lineName.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: 'ชื่อ LINE ไม่สามารถว่างได้',
      };
    }

    // Check length
    if (trimmed.length > 100) {
      return {
        isValid: false,
        error: 'ชื่อ LINE ยาวเกินไป (สูงสุด 100 ตัวอักษร)',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate array of user IDs
   */
  static validateUserIdArray(userIds: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if array
    if (!Array.isArray(userIds)) {
      return {
        isValid: false,
        error: 'ต้องเป็นอาร์เรย์',
      };
    }

    // Check if empty
    if (userIds.length === 0) {
      return {
        isValid: false,
        error: 'ต้องมีอย่างน้อย 1 รายการ',
      };
    }

    // Check each item
    for (const userId of userIds) {
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        return {
          isValid: false,
          error: 'User ID ทั้งหมดต้องเป็นข้อความที่ไม่ว่าง',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate date
   */
  static validateDate(date: any): {
    isValid: boolean;
    error?: string;
  } {
    // Check if Date object or valid date string
    if (!(date instanceof Date) && typeof date !== 'string') {
      return {
        isValid: false,
        error: 'วันที่ต้องเป็น Date object หรือ string',
      };
    }

    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      return {
        isValid: false,
        error: 'วันที่ไม่ถูกต้อง',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate permission
   */
  static validatePermission(permission: any): {
    isValid: boolean;
    error?: string;
  } {
    const validPermissions = [
      'manage_rounds',
      'view_reports',
      'set_results',
      'manage_venues',
    ];

    if (!validPermissions.includes(permission)) {
      return {
        isValid: false,
        error: `สิทธิ์ไม่ถูกต้อง: ${permission}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate status
   */
  static validateStatus(status: any): {
    isValid: boolean;
    error?: string;
  } {
    const validStatuses = ['open', 'closed', 'settled'];

    if (!validStatuses.includes(status)) {
      return {
        isValid: false,
        error: `สถานะไม่ถูกต้อง: ${status}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate result
   */
  static validateResult(result: any): {
    isValid: boolean;
    error?: string;
  } {
    const validResults = ['win', 'lose', 'pending'];

    if (!validResults.includes(result)) {
      return {
        isValid: false,
        error: `ผลลัพธ์ไม่ถูกต้อง: ${result}`,
      };
    }

    return { isValid: true };
  }
}
