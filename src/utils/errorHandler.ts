/**
 * Error Handler Utilities
 */

import { ERROR_MESSAGES } from '../config/constants';
import { LineMessageHandler } from '../handlers/lineMessageHandler';

export class ErrorHandler {
  /**
   * Handle message parsing error
   */
  static handleParsingError(error: string): string {
    console.error('❌ Parsing error:', error);
    return `❌ ${error}`;
  }

  /**
   * Handle database error
   */
  static async handleDatabaseError(
    error: any,
    groupId?: string
  ): Promise<string> {
    console.error('❌ Database error:', error);

    // Log to admin if groupId provided
    if (groupId) {
      try {
        const errorMessage = `⚠️ Database Error\n\n${error.message || 'Unknown error'}`;
        await LineMessageHandler.sendGroupMessage(groupId, errorMessage);
      } catch (e) {
        console.error('❌ Failed to notify admin:', e);
      }
    }

    return ERROR_MESSAGES.DATABASE_ERROR;
  }

  /**
   * Handle LINE API error
   */
  static async handleLineApiError(
    error: any,
    groupId?: string
  ): Promise<string> {
    console.error('❌ LINE API error:', error);

    // Log to admin if groupId provided
    if (groupId) {
      try {
        const errorMessage = `⚠️ LINE API Error\n\n${error.message || 'Unknown error'}`;
        await LineMessageHandler.sendGroupMessage(groupId, errorMessage);
      } catch (e) {
        console.error('❌ Failed to notify admin:', e);
      }
    }

    return '❌ เกิดข้อผิดพลาดในการติดต่อ LINE';
  }

  /**
   * Handle validation error
   */
  static handleValidationError(field: string, error: string): string {
    console.error(`❌ Validation error (${field}):`, error);
    return `❌ ${field}: ${error}`;
  }

  /**
   * Handle permission error
   */
  static handlePermissionError(): string {
    console.warn('⚠️ Permission denied');
    return ERROR_MESSAGES.ADMIN_ONLY;
  }

  /**
   * Handle not found error
   */
  static handleNotFoundError(resource: string): string {
    console.warn(`⚠️ ${resource} not found`);
    return `❌ ไม่พบ ${resource}`;
  }

  /**
   * Handle timeout error
   */
  static handleTimeoutError(): string {
    console.error('❌ Operation timeout');
    return '❌ หมดเวลาในการประมวลผล กรุณาลองใหม่';
  }

  /**
   * Handle invalid format error
   */
  static handleInvalidFormatError(format: string): string {
    console.error('❌ Invalid format:', format);
    return `❌ รูปแบบไม่ถูกต้อง: ${format}`;
  }

  /**
   * Log error with context
   */
  static logError(
    context: string,
    error: any,
    additionalInfo?: any
  ): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';

    console.error(`[${timestamp}] ❌ ${context}`);
    console.error(`Message: ${errorMessage}`);

    if (stack) {
      console.error(`Stack: ${stack}`);
    }

    if (additionalInfo) {
      console.error(`Additional Info:`, additionalInfo);
    }
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(
    data: any,
    requiredFields: string[]
  ): {
    isValid: boolean;
    missingFields?: string[];
  } {
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      console.warn('⚠️ Missing required fields:', missingFields);
      return {
        isValid: false,
        missingFields,
      };
    }

    return { isValid: true };
  }

  /**
   * Validate data types
   */
  static validateDataTypes(
    data: any,
    schema: Record<string, string>
  ): {
    isValid: boolean;
    errors?: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    for (const [field, expectedType] of Object.entries(schema)) {
      const actualType = typeof data[field];

      if (actualType !== expectedType) {
        errors[field] = `Expected ${expectedType}, got ${actualType}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      console.warn('⚠️ Data type validation failed:', errors);
      return {
        isValid: false,
        errors,
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 1000); // Limit length
  }

  /**
   * Create error response
   */
  static createErrorResponse(
    success: boolean,
    message: string,
    error?: any
  ): {
    success: boolean;
    message: string;
    error?: string;
  } {
    return {
      success,
      message,
      error: error ? String(error) : undefined,
    };
  }
}
