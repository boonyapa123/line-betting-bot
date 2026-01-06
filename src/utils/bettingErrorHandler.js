const logger = require('./logger');

/**
 * Betting Error Handler
 * Centralized error handling for betting system
 */
class BettingErrorHandler {
  /**
   * Handle betting error
   */
  static handleError(error, context = {}) {
    try {
      logger.error('Betting system error', {
        error: error.message,
        stack: error.stack,
        context,
      });

      // Determine error type and return appropriate response
      const errorResponse = this.getErrorResponse(error, context);

      return errorResponse;
    } catch (handlingError) {
      logger.error('Error in error handler:', handlingError);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Get error response based on error type
   */
  static getErrorResponse(error, context = {}) {
    const errorMessage = error.message || 'Unknown error';

    // Google Sheets errors
    if (errorMessage.includes('Google Sheets') || errorMessage.includes('googleapis')) {
      return {
        success: false,
        error: 'ไม่สามารถเชื่อมต่อ Google Sheets ได้',
        code: 'SHEETS_ERROR',
        details: errorMessage,
      };
    }

    // LINE API errors
    if (errorMessage.includes('LINE') || errorMessage.includes('line')) {
      return {
        success: false,
        error: 'ไม่สามารถส่งข้อความไปยัง LINE ได้',
        code: 'LINE_ERROR',
        details: errorMessage,
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        code: 'VALIDATION_ERROR',
        details: errorMessage,
      };
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return {
        success: false,
        error: 'หมดเวลาในการประมวลผล',
        code: 'TIMEOUT_ERROR',
        details: errorMessage,
      };
    }

    // Default error
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการประมวลผล',
      code: 'GENERAL_ERROR',
      details: errorMessage,
    };
  }

  /**
   * Validate betting data
   */
  static validateBettingData(data) {
    const errors = [];

    if (!data.playerName || typeof data.playerName !== 'string') {
      errors.push('ชื่อผู้เล่นไม่ถูกต้อง');
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('จำนวนเงินต้องมากกว่า 0');
    }

    if (!data.fireworks || typeof data.fireworks !== 'string') {
      errors.push('ประเภทบั้งไฟไม่ถูกต้อง');
    }

    if (!data.stadium || typeof data.stadium !== 'string') {
      errors.push('ชื่อสนามไม่ถูกต้อง');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Validate result data
   */
  static validateResultData(data) {
    const errors = [];

    if (!data.playerName || typeof data.playerName !== 'string') {
      errors.push('ชื่อผู้เล่นไม่ถูกต้อง');
    }

    if (!data.stadium || typeof data.stadium !== 'string') {
      errors.push('ชื่อสนามไม่ถูกต้อง');
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('จำนวนเงินต้องมากกว่า 0');
    }

    if (!['win', 'loss', 'pending'].includes(data.result)) {
      errors.push('ผลลัพธ์ต้องเป็น win, loss หรือ pending');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`Attempting operation (attempt ${attempt + 1}/${maxRetries})`);
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error.message);

        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.info(`Retrying after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Operation failed after all retries:', lastError);
    throw lastError;
  }

  /**
   * Safe execute with error handling
   */
  static async safeExecute(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      return this.handleError(error, context);
    }
  }
}

module.exports = BettingErrorHandler;
