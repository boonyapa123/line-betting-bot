/**
 * AnnouncedPriceService
 * จัดการช่วงราคาที่แอดมินประกาศ (ราคาช่าง)
 * เก็บข้อมูลลง Google Sheets ชีท "AnnouncedPrices"
 * 
 * ตัวอย่าง: "ช่าง 330-375 เก่งเจริญ"
 * → เก็บ { slipName: "เก่งเจริญ", priceRange: "330-375", min: 330, max: 375 }
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class AnnouncedPriceService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.sheetName = 'AnnouncedPrices';
    // Cache ใน memory เพื่อลด API calls
    this.cache = new Map(); // Map<groupId, Map<slipName, priceData>>
  }

  async initialize() {
    try {
      let credentials;
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      } else {
        const credentialsPath = path.join(
          __dirname, '../../',
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'credentials.json'
        );
        credentials = JSON.parse(fs.readFileSync(credentialsPath));
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheets = google.sheets({ version: 'v4', auth });

      // โหลดข้อมูลจาก sheet เข้า cache
      await this.loadFromSheet();
      console.log('✅ AnnouncedPriceService initialized');
    } catch (error) {
      console.error('Error initializing AnnouncedPriceService:', error);
    }
  }

  async ensureInitialized() {
    if (!this.sheets) {
      await this.initialize();
    }
  }

  /**
   * โหลดข้อมูลจาก Google Sheets เข้า cache
   */
  async loadFromSheet() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:F`,
      });

      const rows = response.data.values || [];
      this.cache.clear();

      for (const row of rows) {
        const [groupId, slipName, priceRange, min, max, announcedAt] = row;
        if (!groupId || !slipName || !priceRange) continue;

        if (!this.cache.has(groupId)) {
          this.cache.set(groupId, new Map());
        }
        this.cache.get(groupId).set(slipName, {
          slipName,
          priceRange,
          min: parseInt(min),
          max: parseInt(max),
          announcedAt: announcedAt || '',
        });
      }

      console.log(`📋 Loaded ${rows.length} announced prices from sheet`);
    } catch (error) {
      // ชีทอาจยังไม่มี — ไม่เป็นไร
      console.warn(`⚠️  Could not load AnnouncedPrices sheet: ${error.message}`);
    }
  }

  /**
   * ประกาศช่วงราคาสำหรับบั้งไฟ
   */
  async announcePrice(groupId, slipName, priceRange) {
    const match = priceRange.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return { success: false, error: 'รูปแบบราคาไม่ถูกต้อง ต้องเป็น เช่น 330-375' };
    }

    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    if (min >= max) {
      return { success: false, error: 'ราคาต่ำสุดต้องน้อยกว่าราคาสูงสุด' };
    }

    await this.ensureInitialized();

    const trimmedName = slipName.trim();
    const announcedAt = new Date().toLocaleString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });

    // อัปเดต cache
    if (!this.cache.has(groupId)) {
      this.cache.set(groupId, new Map());
    }
    this.cache.get(groupId).set(trimmedName, {
      slipName: trimmedName, priceRange, min, max, announcedAt,
    });

    // บันทึกลง Google Sheets
    try {
      // ลบแถวเก่าของ slipName นี้ในกลุ่มนี้ (ถ้ามี) แล้วเพิ่มใหม่
      await this.removeFromSheet(groupId, trimmedName);
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:F`,
        valueInputOption: 'RAW',
        resource: {
          values: [[groupId, trimmedName, priceRange, min, max, announcedAt]],
        },
      });
      console.log(`📢 ประกาศราคาช่าง: ${trimmedName} = ${priceRange} (กลุ่ม: ${groupId})`);
    } catch (error) {
      console.error('Error saving announced price:', error);
    }

    return { success: true, slipName: trimmedName, priceRange, min, max };
  }

  /**
   * ค้นหาช่วงราคาที่ประกาศไว้ (รองรับ partial match)
   */
  getAnnouncedPrice(groupId, slipName) {
    const groupPrices = this.cache.get(groupId);
    if (!groupPrices) return null;

    const trimmedName = slipName.trim();

    // exact match เท่านั้น
    if (groupPrices.has(trimmedName)) {
      return groupPrices.get(trimmedName);
    }

    return null;
  }

  /**
   * ดึงรายการช่วงราคาทั้งหมดในกลุ่ม
   */
  getAllAnnouncedPrices(groupId) {
    const groupPrices = this.cache.get(groupId);
    if (!groupPrices) return [];
    return Array.from(groupPrices.values());
  }

  /**
   * ลบช่วงราคาจาก Google Sheets
   * @private
   */
  async removeFromSheet(groupId, slipName) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:F`,
      });

      const rows = response.data.values || [];
      const trimmedName = slipName.trim();

      // หาแถวที่ต้องลบ (exact หรือ partial match)
      const rowsToDelete = [];
      for (let i = 0; i < rows.length; i++) {
        const rowGroupId = rows[i][0];
        const rowSlipName = rows[i][1];
        if (rowGroupId === groupId &&
            (rowSlipName === trimmedName ||
             rowSlipName.includes(trimmedName) ||
             trimmedName.includes(rowSlipName))) {
          rowsToDelete.push(i + 2); // +2 เพราะ header + 0-indexed
        }
      }

      // ลบจากล่างขึ้นบน เพื่อไม่ให้ index เลื่อน
      for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        const rowIndex = rowsToDelete[i];
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${this.sheetName}!A${rowIndex}:F${rowIndex}`,
          valueInputOption: 'RAW',
          resource: { values: [['', '', '', '', '', '']] },
        });
      }
    } catch (error) {
      // ไม่เป็นไรถ้าลบไม่ได้
      console.warn(`⚠️  Could not remove from sheet: ${error.message}`);
    }
  }

  /**
   * ลบช่วงราคาของบั้งไฟ (เมื่อประกาศผลแล้ว)
   */
  async removeAnnouncedPrice(groupId, slipName) {
    const trimmedName = slipName.trim();

    // ลบจาก cache
    const groupPrices = this.cache.get(groupId);
    if (groupPrices) {
      // exact match
      if (groupPrices.has(trimmedName)) {
        groupPrices.delete(trimmedName);
      } else {
        // partial match
        for (const [name] of groupPrices) {
          if (name.includes(trimmedName) || trimmedName.includes(name)) {
            groupPrices.delete(name);
            break;
          }
        }
      }
    }

    // ลบจาก sheet
    await this.ensureInitialized();
    await this.removeFromSheet(groupId, trimmedName);
  }

  /**
   * ล้างช่วงราคาทั้งหมดในกลุ่ม
   */
  async clearGroupPrices(groupId) {
    this.cache.delete(groupId);
    // ลบจาก sheet ทั้งหมดของกลุ่มนี้
    try {
      await this.ensureInitialized();
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:F`,
      });
      const rows = response.data.values || [];
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][0] === groupId) {
          const rowIndex = i + 2;
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A${rowIndex}:F${rowIndex}`,
            valueInputOption: 'RAW',
            resource: { values: [['', '', '', '', '', '']] },
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not clear group prices: ${error.message}`);
    }
  }
}

// Singleton instance
module.exports = new AnnouncedPriceService();
