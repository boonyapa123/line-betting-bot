const axios = require('axios');

/**
 * ระบบดึงข้อมูลบัญชีจาก Slip2Go API
 */
class Slip2GoAccountService {
  constructor(slip2GoSecretKey, slip2GoApiUrl = 'https://api.slip2go.com') {
    this.secretKey = slip2GoSecretKey;
    this.apiUrl = slip2GoApiUrl;
  }

  /**
   * ดึงข้อมูลบัญชีทั้งหมด
   * @returns {Promise<Array>} ข้อมูลบัญชี
   */
  async getAccounts() {
    try {
      console.log(`🔍 Fetching accounts from Slip2Go API...`);
      console.log(`   URL: ${this.apiUrl}/accounts`);

      const response = await axios.get(
        `${this.apiUrl}/accounts`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`   ✅ Response received:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * ดึงข้อมูลบัญชีตามประเภท
   * @param {string} accountType - ประเภทบัญชี (เช่น '01004')
   * @returns {Promise<Array>} ข้อมูลบัญชี
   */
  async getAccountsByType(accountType) {
    try {
      console.log(`🔍 Fetching accounts by type: ${accountType}...`);

      const response = await axios.get(
        `${this.apiUrl}/accounts?type=${accountType}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`   ✅ Found ${response.data.length} account(s)`);
      return response.data;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลบัญชีตามเลขบัญชี
   * @param {string} accountNumber - เลขบัญชี
   * @returns {Promise<Object>} ข้อมูลบัญชี
   */
  async getAccountByNumber(accountNumber) {
    try {
      console.log(`🔍 Fetching account: ${accountNumber}...`);

      const response = await axios.get(
        `${this.apiUrl}/accounts/${accountNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`   ✅ Account found: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลบัญชีทั้งหมดและแคชไว้
   * @returns {Promise<Object>} ข้อมูลบัญชีที่จัดเรียง
   */
  async getAccountsMap() {
    try {
      console.log(`🔍 Fetching all accounts and creating map...`);

      const accounts = await this.getAccounts();
      const accountMap = {};

      // จัดเรียงบัญชีตามเลขบัญชี
      accounts.forEach(account => {
        accountMap[account.accountNumber] = {
          accountNumber: account.accountNumber,
          name: account.name,
          bank: account.bank,
          accountType: account.accountType,
          status: account.status
        };
      });

      console.log(`   ✅ Created account map with ${Object.keys(accountMap).length} account(s)`);
      return accountMap;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าบัญชีมีอยู่หรือไม่
   * @param {string} accountNumber - เลขบัญชี
   * @returns {Promise<boolean>}
   */
  async accountExists(accountNumber) {
    try {
      console.log(`🔍 Checking if account exists: ${accountNumber}...`);

      const response = await axios.get(
        `${this.apiUrl}/accounts/${accountNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`   ✅ Account exists`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`   ❌ Account not found`);
        return false;
      }
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลบัญชีและตรวจสอบว่าตรงกับสลิปหรือไม่
   * @param {string} accountNumber - เลขบัญชี
   * @param {Object} slipData - ข้อมูลสลิป
   * @returns {Promise<Object>} ผลการตรวจสอบ
   */
  async validateAccountFromSlip(accountNumber, slipData) {
    try {
      console.log(`🔍 Validating account from slip...`);
      console.log(`   Account: ${accountNumber}`);
      console.log(`   Slip receiver: ${slipData.receiverAccount}`);

      // ดึงข้อมูลบัญชีจาก Slip2Go
      const account = await this.getAccountByNumber(accountNumber);

      // ตรวจสอบว่าบัญชีตรงกับสลิปหรือไม่
      const normalizedAccount = accountNumber.replace(/\s/g, '').toUpperCase();
      const normalizedSlipReceiver = slipData.receiverAccount.replace(/\s/g, '').toUpperCase();

      const isMatched = normalizedAccount === normalizedSlipReceiver;

      console.log(`   Account name: ${account.name}`);
      console.log(`   Slip receiver name: ${slipData.receiverName}`);
      console.log(`   Match: ${isMatched ? '✅' : '❌'}`);

      return {
        isMatched,
        account,
        slipData,
        message: isMatched ? 'Account matched' : 'Account not matched'
      };
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      throw error;
    }
  }
}

module.exports = Slip2GoAccountService;
