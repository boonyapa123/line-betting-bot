/**
 * Payment Routes
 * API endpoints สำหรับจัดการการโอนเงิน
 */

import { Router, Request, Response } from 'express';
import { PaymentLinkService, PaymentLinkData } from '../services/paymentLinkService';
import { ErrorHandler } from '../utils/errorHandler';

const router = Router();

/**
 * POST /api/send-payment-link
 * รับข้อมูลการโอนเงินจาก LIFF และส่งไปยังกลุ่ม
 */
router.post('/send-payment-link', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      bankName,
      accountNumber,
      accountName,
      paymentLink,
      note,
      userId,
      timestamp,
    } = req.body;

    // Validate required fields
    if (!groupId || !bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Prepare data
    const paymentData: PaymentLinkData = {
      groupId,
      bankName,
      accountNumber,
      accountName,
      paymentLink: paymentLink || undefined,
      note: note || undefined,
      userId,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Send to group
    await PaymentLinkService.sendToGroup(paymentData);

    // Log to database/sheet (optional)
    console.log('📊 Payment link logged:', {
      groupId,
      bankName,
      accountNumber,
      accountName,
      timestamp: paymentData.timestamp,
    });

    res.json({
      success: true,
      message: 'Payment link sent successfully',
    });
  } catch (error) {
    ErrorHandler.logError('Error sending payment link', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send payment link',
    });
  }
});

/**
 * GET /api/groups
 * ได้รับรายการกลุ่มทั้งหมด
 */
router.get('/groups', async (req: Request, res: Response) => {
  try {
    // TODO: Get groups from database
    // For now, return mock data
    const groups = [
      {
        id: process.env.LINE_GROUP_ID || 'C1234567890',
        name: 'ห้องแทงหลัก',
      },
      {
        id: 'C0987654321',
        name: 'ห้องแทงสำรอง',
      },
    ];

    res.json({
      success: true,
      groups,
    });
  } catch (error) {
    ErrorHandler.logError('Error getting groups', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get groups',
    });
  }
});

export default router;
