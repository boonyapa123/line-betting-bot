/**
 * Result Summary Service
 * จัดการการสรุปผลแข่ง - ดึงข้อมูลจาก Google Sheets และให้ผู้ใช้บันทึกผลแข่ง
 * ✅ ไม่ตรวจสอบ admin - ทุกคนใช้ได้
 */

const { client } = require('../config/line');
const openBettingRecordService = require('./openBettingRecordService');

class ResultSummaryService {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Request result summary input from user
   * ขอให้ผู้ใช้บันทึกผลแข่ง - ส่ง LIFF form
   */
  async requestResultSummaryInput(replyToken, userId, groupId) {
    try {
      // Store pending request
      this.pendingRequests.set(userId, { groupId, timestamp: Date.now() });

      const liffId = process.env.LIFF_ID;
      const liffUrl = process.env.LIFF_URL || 'https://liff.line.me';

      console.log('🔍 DEBUG - LIFF_ID from env:', liffId);
      console.log('🔍 DEBUG - All env vars:', {
        LIFF_ID: process.env.LIFF_ID,
        LIFF_ID_OPEN_BETTING: process.env.LIFF_ID_OPEN_BETTING,
        LIFF_ID_RESULT_SUMMARY: process.env.LIFF_ID_RESULT_SUMMARY,
      });

      if (!liffId || liffId === 'YOUR_LIFF_ID_HERE') {
        console.warn('⚠️ LIFF_ID not configured, sending text message instead');
        const message = `📊 สรุปผลแข่ง

กรุณาส่งข้อมูลในรูปแบบ:
สรุปผลแข่ง <สนาม> <ผลแข่ง>

ตัวอย่าง:
สรุปผลแข่ง ท่าไห ชนะ`;

        await client.replyMessage(replyToken, {
          type: 'text',
          text: message,
        });
        return;
      }

      // Send LIFF form
      const liffAppUrl = `https://liff.line.me/${liffId}?groupId=${groupId}&form=result-summary-edit`;
      console.log('📝 Generated LIFF URL:', liffAppUrl);
      
      const flexMessage = {
        type: 'flex',
        altText: '📊 กรุณาบันทึกผลแข่ง',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: '📊 สรุปผลแข่ง',
                size: 'xl',
                weight: 'bold',
                color: '#667eea',
              },
              {
                type: 'text',
                text: 'กรุณาบันทึกผลแข่งของวันนี้',
                size: 'sm',
                color: '#999999',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '📝 บันทึกผลแข่ง',
                  uri: liffAppUrl,
                },
                color: '#667eea',
              },
            ],
          },
        },
      };

      await client.replyMessage(replyToken, flexMessage);

      console.log('📝 LIFF form sent to user:', userId);
    } catch (error) {
      console.error('❌ Error requesting result summary input:', error);
    }
  }

  /**
   * Get today's venues from Google Sheets
   * ดึงรายชื่อสนามของวันนี้จาก Google Sheets
   */
  async getTodayVenues() {
    try {
      console.log('🔍 getTodayVenues called');
      const result = await openBettingRecordService.getTodayRecords();

      console.log('📊 getTodayRecords result:', result);

      if (!result.success || !result.records) {
        console.error('❌ No records found:', result.error);
        return { success: true, venues: [] };
      }

      console.log(`📝 Total records: ${result.records.length}`);
      console.log('📝 Records:', result.records);

      // Get all venue data (which contains the betting info)
      const allVenues = [];
      const venueSet = new Set();

      result.records.forEach((record) => {
        console.log(`🔍 Processing record:`, record);
        // Use venue field which contains the actual data
        if (record.venue && !venueSet.has(record.venue)) {
          venueSet.add(record.venue);
          const message = `🏟️ ${record.venue}${record.fireNumber ? ' - บั้งไฟ ' + record.fireNumber : ''}${record.roomLink ? '\n🔗 ' + record.roomLink : ''}`;
          allVenues.push({
            venue: record.venue,
            message: message,
          });
          console.log(`✅ Added venue: ${record.venue}`);
        }
      });

      console.log(`✅ Retrieved ${allVenues.length} records for today`);
      console.log('🔍 Venues:', allVenues.map(v => v.message));

      return { success: true, venues: allVenues };
    } catch (error) {
      console.error('❌ Error getting today venues:', error);
      return { success: true, venues: [] };
    }
  }

  /**
   * Save result summary to Google Sheets
   * บันทึกผลแข่งเข้า Google Sheets
   */
  async saveResultSummary(resultText) {
    try {
      console.log('💾 Saving result summary...');
      console.log('📝 Result text:', resultText);

      // Get today's date for sheet name
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Sheet name for results
      const resultsSheetName = `Results-${dateStr}`;

      console.log(`📊 Saving to sheet: ${resultsSheetName}`);

      // Get sheets client from openBettingRecordService
      const { getSheets, getSpreadsheetId } = require('./openBettingRecordService');
      const sheets = getSheets();
      const spreadsheetId = getSpreadsheetId();

      if (!sheets || !spreadsheetId) {
        throw new Error('Google Sheets not initialized');
      }

      // Prepare data to save
      const timestamp = new Date().toLocaleTimeString('th-TH');
      const rowData = [timestamp, resultText];

      // Try to append to existing sheet or create new one
      try {
        // First, try to append to the sheet
        const appendRequest = {
          spreadsheetId,
          range: `'${resultsSheetName}'!A:B`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [rowData],
          },
        };

        await sheets.spreadsheets.values.append(appendRequest);
        console.log('✅ Result saved to Google Sheets');
        return { success: true, message: 'Result saved successfully' };
      } catch (appendError) {
        console.warn('⚠️ Could not append to sheet, trying to create new sheet...');
        
        // If sheet doesn't exist, create it
        const batchUpdateRequest = {
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: resultsSheetName,
                  },
                },
              },
            ],
          },
        };

        await sheets.spreadsheets.batchUpdate(batchUpdateRequest);
        console.log(`✅ Created new sheet: ${resultsSheetName}`);

        // Now append the data
        const appendRequest = {
          spreadsheetId,
          range: `'${resultsSheetName}'!A:B`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [
              ['เวลา', 'ผลแข่ง'], // Header
              rowData,
            ],
          },
        };

        await sheets.spreadsheets.values.append(appendRequest);
        console.log('✅ Result saved to new Google Sheets');
        return { success: true, message: 'Result saved successfully' };
      }
    } catch (error) {
      console.error('❌ Error saving result summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send result summary to LINE group
   * ส่งผลแข่งเข้ากลุ่ม LINE
   */
  async sendResultToGroup(groupId, resultText) {
    try {
      console.log('📤 Sending result to group...');

      const message = `📊 ผลแข่งของวันนี้\n\n${resultText}`;

      await client.pushMessage(groupId, {
        type: 'text',
        text: message,
      });

      console.log('✅ Result sent to group');
      return { success: true, message: 'Result sent to group' };
    } catch (error) {
      console.error('❌ Error sending result to group:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const resultSummaryService = new ResultSummaryService();

module.exports = resultSummaryService;
