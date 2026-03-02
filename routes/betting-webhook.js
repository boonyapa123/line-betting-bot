/**
 * Betting Webhook Route
 * จัดการ LINE webhook สำหรับระบบการเล่นพนัน
 */

const express = require('express');
const router = express.Router();
const bettingRoundController = require('../services/betting/bettingRoundController');

/**
 * Initialize betting controller
 */
let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    try {
      await bettingRoundController.initialize();
      isInitialized = true;
      console.log('Betting controller initialized');
    } catch (error) {
      console.error('Failed to initialize betting controller:', error);
      throw error;
    }
  }
}

/**
 * POST /betting/webhook
 * รับ webhook จาก LINE
 */
router.post('/webhook', async (req, res) => {
  try {
    await ensureInitialized();

    const { events } = req.body;

    if (!events || events.length === 0) {
      return res.status(200).json({ message: 'No events' });
    }

    // ประมวลผลแต่ละ event
    const responses = [];
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const response = await bettingRoundController.handleMessage(event);
        responses.push(response);
      }
    }

    // ส่งตอบกลับ
    if (responses.length > 0) {
      // ส่งข้อความตอบกลับไปยัง LINE
      // (ในการใช้งานจริง ต้องใช้ LINE SDK เพื่อส่งข้อความ)
      console.log('Responses:', responses);
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Error in betting webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /betting/status
 * ตรวจสอบสถานะระบบ
 */
router.get('/status', async (req, res) => {
  try {
    await ensureInitialized();

    const currentState = bettingRoundController.getCurrentState?.();
    const currentRound = bettingRoundController.getCurrentRound?.();

    res.status(200).json({
      status: 'OK',
      currentState,
      currentRound,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /betting/admin/start
 * Admin command: เริ่มรอบ
 */
router.post('/admin/start', async (req, res) => {
  try {
    await ensureInitialized();

    const { slipName } = req.body;

    if (!slipName) {
      return res.status(400).json({ error: 'slipName is required' });
    }

    const result = await bettingRoundController.handleAdminCommand(
      { command: 'START', slipName },
      'ADMIN'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in start command:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /betting/admin/stop
 * Admin command: หยุดรอบ
 */
router.post('/admin/stop', async (req, res) => {
  try {
    await ensureInitialized();

    const result = await bettingRoundController.handleAdminCommand(
      { command: 'STOP' },
      'ADMIN'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in stop command:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /betting/admin/calculate
 * Admin command: สรุปผลลัพธ์
 */
router.post('/admin/calculate', async (req, res) => {
  try {
    await ensureInitialized();

    const { slipName, score } = req.body;

    if (!slipName || score === undefined) {
      return res.status(400).json({
        error: 'slipName and score are required',
      });
    }

    const result = await bettingRoundController.handleAdminCommand(
      { command: 'CALCULATE', slipName, score: parseInt(score) },
      'ADMIN'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in calculate command:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /betting/transactions
 * ดึงข้อมูลการเล่นทั้งหมด
 */
router.get('/transactions', async (req, res) => {
  try {
    await ensureInitialized();

    const bettingPairingService = require('../services/betting/bettingPairingService');
    const transactions = await bettingPairingService.getAllBets();

    res.status(200).json({
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /betting/balances
 * ดึงยอดเงินคงเหลือทั้งหมด
 */
router.get('/balances', async (req, res) => {
  try {
    await ensureInitialized();

    const bettingPairingService = require('../services/betting/bettingPairingService');
    const balances = await bettingPairingService.getAllBalances();

    res.status(200).json({
      count: balances.length,
      balances,
    });
  } catch (error) {
    console.error('Error getting balances:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /betting/balance/:userId
 * ดึงยอดเงินของ User เฉพาะคน
 */
router.get('/balance/:userId', async (req, res) => {
  try {
    await ensureInitialized();

    const { userId } = req.params;
    const bettingPairingService = require('../services/betting/bettingPairingService');
    const balance = await bettingPairingService.getUserBalance(userId);

    res.status(200).json({
      userId,
      balance,
    });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /betting/check-balance
 * ตรวจสอบยอดเงินสำหรับการเดิมพัน
 */
router.post('/check-balance', async (req, res) => {
  try {
    await ensureInitialized();

    const { userId, requiredAmount } = req.body;

    if (!userId || !requiredAmount) {
      return res.status(400).json({
        error: 'userId and requiredAmount are required',
      });
    }

    const balanceCheckService = require('../services/betting/balanceCheckService');
    const result = await balanceCheckService.checkBalance(userId, requiredAmount);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /slip2go/accounts
 * ดึงข้อมูลบัญชีที่ตั้งค่าไว้ใน Slip2Go
 */
router.get('/slip2go/accounts', async (req, res) => {
  try {
    const Slip2GoAccountService = require('../services/betting/slip2GoAccountService');
    const slip2GoSecretKey = process.env.SLIP2GO_SECRET_KEY;
    const slip2GoApiUrl = process.env.SLIP2GO_API_URL || 'https://connect.slip2go.com/api/verify-slip/qr-image/info';
    
    if (!slip2GoSecretKey) {
      return res.status(400).json({
        error: 'SLIP2GO_SECRET_KEY not configured',
      });
    }

    const accountService = new Slip2GoAccountService(slip2GoSecretKey, slip2GoApiUrl);
    const accounts = await accountService.getAccounts();

    res.status(200).json({
      success: true,
      count: accounts.length,
      accounts: accounts
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
