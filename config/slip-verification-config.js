/**
 * ตั้งค่าการตรวจสอบสลิป
 */

module.exports = {
  // ตั้งค่า Slip2Go API
  slip2go: {
    secretKey: process.env.SLIP2GO_SECRET_KEY,
    apiUrl: process.env.SLIP2GO_API_URL || 'https://api.slip2go.com',
  },

  // ตั้งค่า LINE
  line: {
    accessToken: process.env.LINE_SLIP_VERIFICATION_ACCESS_TOKEN,
    channelSecret: process.env.LINE_SLIP_VERIFICATION_CHANNEL_SECRET,
  },

  // ตั้งค่าการตรวจสอบสลิป
  verification: {
    // ตรวจสอบสลิปซ้ำ
    checkDuplicate: process.env.SLIP_CHECK_DUPLICATE === 'true',

    // ตรวจสอบบัญชีผู้รับ
    checkReceiver: process.env.SLIP_CHECK_RECEIVER === 'true',

    // ตรวจสอบจำนวนเงิน
    checkAmount: process.env.SLIP_CHECK_AMOUNT === 'true',

    // ตรวจสอบวันที่
    checkDate: process.env.SLIP_CHECK_DATE === 'true',

    // บัญชีผู้รับที่อนุญาต
    allowedReceivers: [
      {
        accountNumber: process.env.RECEIVER_ACCOUNT_NUMBER || 'xxxxxx1234',
        accountType: process.env.RECEIVER_ACCOUNT_TYPE || '01004', // ธนาคารกสิกรไทย
        accountNameTH: process.env.RECEIVER_ACCOUNT_NAME_TH || 'บริษัท สลิปทูโก จำกัด',
      }
    ],

    // จำนวนเงินที่อนุญาต
    allowedAmount: {
      type: process.env.AMOUNT_CHECK_TYPE || 'gte', // gte, lte, eq
      amount: process.env.AMOUNT_CHECK_VALUE || '0',
    },

    // วันที่ที่อนุญาต
    allowedDate: {
      type: process.env.DATE_CHECK_TYPE || 'gte',
      date: process.env.DATE_CHECK_VALUE || new Date().toISOString(),
    },
  },

  // ข้อความตอบกลับ
  messages: {
    success: `✅ ได้รับยอดเงินแล้ว

📊 รายละเอียดสลิป:
━━━━━━━━━━━━━━━━━━━━━━
💰 จำนวนเงิน: {amount} บาท
👤 ผู้ส่ง: {senderName}
👥 ผู้รับ: {receiverName}
📅 วันที่: {dateTime}
🔖 เลขอ้างอิง: {transRef}
━━━━━━━━━━━━━━━━━━━━━━

ขอบคุณที่ใช้บริการ 🙏`,

    errors: {
      '200401': '❌ บัญชีผู้รับไม่ถูกต้อง\nโปรดโอนเข้าบัญชีบริษัทเท่านั้น',
      '200402': '❌ ยอดโอนเงินไม่ตรงเงื่อนไข\nกรุณาตรวจสอบจำนวนเงิน',
      '200403': '❌ วันที่โอนไม่ตรงเงื่อนไข\nกรุณาตรวจสอบวันที่',
      '200404': '❌ ไม่พบข้อมูลสลิปในระบบธนาคาร\nกรุณาตรวจสอบรูปภาพสลิป',
      '200500': '❌ สลิปเสีย/สลิปปลอม\nกรุณาส่งสลิปที่ถูกต้อง',
      '200501': '❌ สลิปซ้ำ\nสลิปนี้ถูกใช้ไปแล้ว',
      'default': '❌ ข้อผิดพลาด: {message}',
    },
  },

  // ธนาคารที่รองรับ
  banks: {
    '01002': 'ธนาคารกรุงเทพ (Bangkok Bank)',
    '01004': 'ธนาคารกสิกรไทย (Kasikorn Bank)',
    '01006': 'ธนาคารกรุงไทย (Krung Thai Bank)',
    '01011': 'ธนาคารทหารไทยธนชาต (TMB Thanachart Bank)',
    '01014': 'ธนาคารไทยพาณิชย์ (SCB)',
    '01025': 'ธนาคารกรุงศรีอยุธยา (Krungsri Bank)',
    '01069': 'ธนาคารเกียรตินาคินภัทร (Kiatnakin Bank)',
    '01022': 'ธนาคารซีไอเอ็มบีไทย (CIMB Thai Bank)',
    '01067': 'ธนาคารทิสโก้ (TISCO Bank)',
    '01024': 'ธนาคารยูโอบี (UOB)',
    '01071': 'ธนาคารไทยเครดิต (Thai Credit Bank)',
    '01073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
    '01070': 'ธนาคารไอซีบีซี (ไทย) (ICBC Thai)',
    '01098': 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อม (SME Bank)',
    '01034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)',
    '01035': 'ธนาคารเพื่อการส่งออกและนำเข้า (EXIM Bank)',
    '01030': 'ธนาคารออมสิน (GSB)',
    '01033': 'ธนาคารอาคารสงเคราะห์ (GHB)',
    '01066': 'ธนาคารอิสลามแห่งประเทศไทย (Islamic Bank)',
    '02001': 'PromptPay เบอร์โทรศัพท์',
    '02003': 'PromptPay บัตรประชาชน',
    '02004': 'PromptPay E-Wallet',
    '03000': 'K+ Shop, แม่มณี, Be Merchant NextGen, TTB Smart Shop',
    '04000': 'True Money Wallet',
  },

  // Response Codes
  responseCodes: {
    '200000': { status: 'success', message: 'Slip found' },
    '200001': { status: 'success', message: 'Get Info Success' },
    '200200': { status: 'success', message: 'Slip is Valid' },
    '200401': { status: 'error', message: 'Recipient Account Not Match' },
    '200402': { status: 'error', message: 'Transfer Amount Not Match' },
    '200403': { status: 'error', message: 'Transfer Date Not Match' },
    '200404': { status: 'error', message: 'Slip Not Found' },
    '200500': { status: 'error', message: 'Slip is Fraud' },
    '200501': { status: 'error', message: 'Slip is Duplicated' },
  },
};
