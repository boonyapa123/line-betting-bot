/**
 * Rich Menu Input Service
 * จัดการการรับข้อมูลจากผู้ใช้สำหรับปุ่มต่างๆ
 */

import { RichMenuHandlers } from '../handlers/richMenuHandlers';
import { ERROR_MESSAGES } from '../config/constants';

export class RichMenuInputService {
  /**
   * Parse and handle "ส่งห้องแข่ง" input
   * Format: ส่งห้องแข่ง [สนาม] [บั้งไฟ]
   */
  static parseSendRoomInput(text: string): {
    isValid: boolean;
    venue?: string;
    fireNumber?: string;
    error?: string;
  } {
    try {
      const parts = text.trim().split(/\s+/);

      if (parts.length < 3) {
        return {
          isValid: false,
          error: 'รูปแบบไม่ถูกต้อง\nใช้: ส่งห้องแข่ง [สนาม] [บั้งไฟ]\nตัวอย่าง: ส่งห้องแข่ง ต 310-35',
        };
      }

      const venue = parts[1];
      const fireNumber = parts.slice(2).join(' ');

      if (!venue || !fireNumber) {
        return {
          isValid: false,
          error: 'กรุณาใส่สนามและบั้งไฟ',
        };
      }

      return {
        isValid: true,
        venue,
        fireNumber,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'เกิดข้อผิดพลาดในการประมวลผล',
      };
    }
  }

  /**
   * Parse and handle "ส่งลิงค์การโอนเงิน" input
   * Format: ส่งลิงค์การโอนเงิน [ธนาคาร] [เลขบัญชี] [ชื่อบัญชี]
   */
  static parseSendPaymentLinkInput(text: string): {
    isValid: boolean;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    error?: string;
  } {
    try {
      const parts = text.trim().split(/\s+/);

      if (parts.length < 4) {
        return {
          isValid: false,
          error: 'รูปแบบไม่ถูกต้อง\nใช้: ส่งลิงค์การโอนเงิน [ธนาคาร] [เลขบัญชี] [ชื่อบัญชี]\nตัวอย่าง: ส่งลิงค์การโอนเงิน ธนาคารกรุงไทย 1234567890 นาย สมชาย',
        };
      }

      const bankName = parts[1];
      const accountNumber = parts[2];
      const accountName = parts.slice(3).join(' ');

      if (!bankName || !accountNumber || !accountName) {
        return {
          isValid: false,
          error: 'กรุณาใส่ข้อมูลธนาคาร เลขบัญชี และชื่อบัญชี',
        };
      }

      // Validate account number (should be numeric)
      if (!/^\d+$/.test(accountNumber)) {
        return {
          isValid: false,
          error: 'เลขบัญชีต้องเป็นตัวเลขเท่านั้น',
        };
      }

      return {
        isValid: true,
        bankName,
        accountNumber,
        accountName,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'เกิดข้อผิดพลาดในการประมวลผล',
      };
    }
  }

  /**
   * Parse and handle "แจ้งผลแทง" input
   * Format: แจ้งผลแทง [สนาม] [บั้งไฟ] [ผู้ชนะ1,ผู้ชนะ2,...]
   */
  static parseAnnounceResultsInput(text: string): {
    isValid: boolean;
    venue?: string;
    fireNumber?: string;
    winners?: string[];
    error?: string;
  } {
    try {
      const parts = text.trim().split(/\s+/);

      if (parts.length < 4) {
        return {
          isValid: false,
          error: 'รูปแบบไม่ถูกต้อง\nใช้: แจ้งผลแทง [สนาม] [บั้งไฟ] [ผู้ชนะ]\nตัวอย่าง: แจ้งผลแทง ต 310-35 สมชาย,สมหญิง',
        };
      }

      const venue = parts[1];
      const fireNumber = parts[2];
      const winnersStr = parts.slice(3).join(' ');
      const winners = winnersStr.split(',').map((w) => w.trim()).filter((w) => w);

      if (!venue || !fireNumber || winners.length === 0) {
        return {
          isValid: false,
          error: 'กรุณาใส่สนาม บั้งไฟ และชื่อผู้ชนะ',
        };
      }

      return {
        isValid: true,
        venue,
        fireNumber,
        winners,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'เกิดข้อผิดพลาดในการประมวลผล',
      };
    }
  }

  /**
   * Check if text is a Rich Menu input command
   */
  static isRichMenuInputCommand(text: string): boolean {
    const commands = [
      'ส่งห้องแข่ง',
      'ส่งลิงค์โอนเงิน',
      'แจ้งผลแทง',
    ];

    return commands.some((cmd) => text.startsWith(cmd));
  }

  /**
   * Get command type from text
   */
  static getCommandType(text: string): string | null {
    if (text.startsWith('ส่งห้องแข่ง')) return 'send_room';
    if (text.startsWith('ส่งลิงค์โอนเงิน')) return 'send_payment_link';
    if (text.startsWith('แจ้งผลแทง')) return 'announce_results';
    return null;
  }
}
