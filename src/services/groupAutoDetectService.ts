/**
 * Group Auto-Detect Service
 * Auto-detect and save GROUP_ID when OA is added to a group
 * ตรวจจับและบันทึก GROUP_ID อัตโนมัติเมื่อ OA ถูกเพิ่มเข้ากลุ่ม
 */

import fs from 'fs';
import path from 'path';
import { lineClient } from '../config/line';

const GROUPS_FILE = path.join(__dirname, '../../data/groups.json');
const ENV_FILE = path.join(__dirname, '../../.env');

export class GroupAutoDetectService {
  /**
   * Handle join event - when OA is added to a group
   * จัดการเหตุการณ์เข้ากลุ่ม - เมื่อ OA ถูกเพิ่มเข้ากลุ่ม
   */
  static async handleJoinEvent(event: any): Promise<void> {
    try {
      const groupId = event.source.groupId;
      const timestamp = new Date().toISOString();

      if (!groupId) {
        console.warn('⚠️ No groupId in join event');
        return;
      }

      console.log('🎉 OA joined group:', groupId);

      // Get group summary from LINE API
      let groupName = 'Unknown Group';
      try {
        const summary = await lineClient.getGroupSummary(groupId);
        groupName = summary.groupName || groupName;
        console.log(`📍 Group name: ${groupName}`);
      } catch (error) {
        console.warn('⚠️ Could not get group summary:', error);
      }

      // Save group to local storage
      this.saveGroupLocally(groupId, groupName, timestamp);

      // Record group to Google Sheets
      await this.recordGroupToSheets(groupId, groupName, timestamp);

      // Auto-update .env file with first group ID
      await this.updateEnvFile(groupId);

      // Send welcome message
      await this.sendWelcomeMessage(groupId, groupName);
    } catch (error) {
      console.error('❌ Error handling join event:', error);
    }
  }

  /**
   * Handle leave event - when OA is removed from a group
   * จัดการเหตุการณ์ออกจากกลุ่ม - เมื่อ OA ถูกลบออกจากกลุ่ม
   */
  static async handleLeaveEvent(event: any): Promise<void> {
    try {
      const groupId = event.source.groupId;

      if (!groupId) {
        console.warn('⚠️ No groupId in leave event');
        return;
      }

      console.log('👋 OA left group:', groupId);

      // Remove group from local storage
      this.removeGroupLocally(groupId);
    } catch (error) {
      console.error('❌ Error handling leave event:', error);
    }
  }

  /**
   * Save group to local storage (data/groups.json)
   */
  private static saveGroupLocally(
    groupId: string,
    groupName: string,
    timestamp: string
  ): void {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(GROUPS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing groups
      let groups: any = {};
      if (fs.existsSync(GROUPS_FILE)) {
        try {
          const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
          groups = JSON.parse(data);
        } catch (error) {
          console.warn('⚠️ Could not parse groups.json:', error);
        }
      }

      // Add or update group
      groups[groupId] = {
        id: groupId,
        name: groupName,
        joinedAt: timestamp,
        lastActive: timestamp,
      };

      // Save to file
      fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
      console.log(`✅ Group saved locally: ${groupId} - ${groupName}`);
    } catch (error) {
      console.error('❌ Error saving group locally:', error);
    }
  }

  /**
   * Remove group from local storage
   */
  private static removeGroupLocally(groupId: string): void {
    try {
      if (!fs.existsSync(GROUPS_FILE)) {
        return;
      }

      const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
      let groups = JSON.parse(data);

      if (groups[groupId]) {
        delete groups[groupId];
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
        console.log(`✅ Group removed locally: ${groupId}`);
      }
    } catch (error) {
      console.error('❌ Error removing group locally:', error);
    }
  }

  /**
   * Auto-update .env file with GROUP_ID
   * ถ้ายังไม่มี LINE_GROUP_ID ให้ใส่ค่า group ID แรกที่ได้
   */
  private static async updateEnvFile(groupId: string): Promise<void> {
    try {
      if (!fs.existsSync(ENV_FILE)) {
        console.warn('⚠️ .env file not found');
        return;
      }

      let envContent = fs.readFileSync(ENV_FILE, 'utf-8');

      // Check if LINE_GROUP_ID already has a value
      const lineGroupIdMatch = envContent.match(/^LINE_GROUP_ID=(.*)$/m);

      if (lineGroupIdMatch && lineGroupIdMatch[1] && lineGroupIdMatch[1].trim()) {
        console.log('ℹ️ LINE_GROUP_ID already set:', lineGroupIdMatch[1]);
        return;
      }

      // Update or add LINE_GROUP_ID
      if (lineGroupIdMatch) {
        // Replace existing empty LINE_GROUP_ID
        envContent = envContent.replace(/^LINE_GROUP_ID=.*$/m, `LINE_GROUP_ID=${groupId}`);
      } else {
        // Add new LINE_GROUP_ID
        envContent += `\n# Auto-detected group ID\nLINE_GROUP_ID=${groupId}\n`;
      }

      fs.writeFileSync(ENV_FILE, envContent);
      console.log(`✅ .env updated with LINE_GROUP_ID: ${groupId}`);
      console.log('⚠️ Please restart the server to apply changes');
    } catch (error) {
      console.error('❌ Error updating .env file:', error);
    }
  }

  /**
   * Send welcome message to group
   */
  private static async sendWelcomeMessage(
    groupId: string,
    groupName: string
  ): Promise<void> {
    try {
      const message = `👋 สวัสดีค่ะ! ยินดีต้อนรับเข้ากลุ่ม ${groupName}

🤖 ฉันคือบอทแทงบั้งไฟ พร้อมช่วยเหลือคุณ

📝 คำสั่งที่ใช้ได้:
• เปิดรับแทง
• ส่งลิ้งค์ห้องแข่ง
• ส่งลิ้งค์การโอนเงิน
• สรุปยอดแทง
• สรุปผลแข่ง

✅ Group ID ได้ถูกบันทึกแล้ว`;

      await lineClient.pushMessage(groupId, {
        type: 'text',
        text: message,
      });

      console.log('✅ Welcome message sent to group:', groupId);
    } catch (error) {
      console.error('❌ Error sending welcome message:', error);
    }
  }

  /**
   * Record group to Google Sheets
   */
  private static async recordGroupToSheets(
    groupId: string,
    groupName: string,
    timestamp: string
  ): Promise<void> {
    try {
      const googleSheetsService = require('./googleSheetsService');
      
      console.log('📊 Recording group to Google Sheets:', { groupId, groupName });
      
      // Add group to "Bets" sheet with special marker
      const result = await googleSheetsService.appendRow('Bets', [
        timestamp,
        `[GROUP] ${groupName}`,
        'กลุ่ม',
        groupId,
        'Active',
        '',
      ]);
      
      if (result.success) {
        console.log('✅ Group recorded to Google Sheets (Bets sheet)');
      } else {
        console.warn('⚠️ Failed to record group to Google Sheets:', result.error);
      }
    } catch (error) {
      console.error('❌ Error recording group to Google Sheets:', error);
    }
  }

  /**
   * Get all registered groups
   */
  static getAllGroups(): any[] {
    try {
      if (!fs.existsSync(GROUPS_FILE)) {
        return [];
      }

      const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
      const groups = JSON.parse(data);
      return Object.values(groups);
    } catch (error) {
      console.error('❌ Error getting groups:', error);
      return [];
    }
  }

  /**
   * Get primary group ID (first registered group)
   */
  static getPrimaryGroupId(): string | null {
    try {
      const groups = this.getAllGroups();
      if (groups.length > 0) {
        return (groups[0] as any).id;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting primary group ID:', error);
      return null;
    }
  }
}
