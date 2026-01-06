/**
 * Link Management Service
 * จัดการและส่งลิงค์ห้องแทงและชำระเงิน
 */

import { VenueRepository } from '../models/Venue';
import { LineMessageHandler } from '../handlers/lineMessageHandler';

export class LinkManagementService {
  /**
   * Send room link to group
   */
  static async sendRoomLink(
    groupId: string,
    venue: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get venue
      const venueData = await VenueRepository.findByName(venue, groupId);

      if (!venueData) {
        return {
          success: false,
          message: `❌ ไม่พบสนาม: ${venue}`,
        };
      }

      // Format message
      let message = `🎯 ลิงค์ห้องแทง ${venue}\n\n`;
      message += `${venueData.roomLink}`;

      // Send to group
      await LineMessageHandler.sendGroupMessage(groupId, message);

      console.log('✅ Room link sent for venue:', venue);

      return {
        success: true,
        message: `✅ ส่งลิงค์ห้องแทง ${venue} เรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error sending room link:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการส่งลิงค์',
      };
    }
  }

  /**
   * Send payment link to group
   */
  static async sendPaymentLink(
    groupId: string,
    paymentLink: string,
    venue?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Format message
      let message = `💳 ลิงค์ชำระเงิน`;

      if (venue) {
        message += ` (${venue})`;
      }

      message += `\n\n${paymentLink}`;

      // Send to group
      await LineMessageHandler.sendGroupMessage(groupId, message);

      console.log('✅ Payment link sent');

      return {
        success: true,
        message: `✅ ส่งลิงค์ชำระเงินเรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error sending payment link:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการส่งลิงค์',
      };
    }
  }

  /**
   * Send all venue links to group
   */
  static async sendAllVenueLinks(groupId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get all active venues
      const venues = await VenueRepository.findActiveVenues(groupId);

      if (venues.length === 0) {
        return {
          success: false,
          message: '❌ ไม่มีสนามแทง',
        };
      }

      // Format message
      let message = `🎯 รายชื่อสนามแทง\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      venues.forEach((venue) => {
        message += `📍 ${venue.name}\n`;
        message += `${venue.roomLink}\n\n`;
      });

      // Send to group
      await LineMessageHandler.sendGroupMessage(groupId, message);

      console.log('✅ All venue links sent');

      return {
        success: true,
        message: `✅ ส่งรายชื่อสนามแทงเรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error sending all venue links:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการส่งลิงค์',
      };
    }
  }

  /**
   * Get venue link
   */
  static async getVenueLink(
    groupId: string,
    venue: string
  ): Promise<{
    success: boolean;
    link?: string;
    message: string;
  }> {
    try {
      const venueData = await VenueRepository.findByName(venue, groupId);

      if (!venueData) {
        return {
          success: false,
          message: `❌ ไม่พบสนาม: ${venue}`,
        };
      }

      return {
        success: true,
        link: venueData.roomLink,
        message: `✅ ได้รับลิงค์ห้องแทง ${venue}`,
      };
    } catch (error) {
      console.error('❌ Error getting venue link:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการดึงลิงค์',
      };
    }
  }

  /**
   * Get payment link
   */
  static async getPaymentLink(
    groupId: string,
    venue?: string
  ): Promise<{
    success: boolean;
    link?: string;
    message: string;
  }> {
    try {
      let venueData;

      if (venue) {
        venueData = await VenueRepository.findByName(venue, groupId);

        if (!venueData) {
          return {
            success: false,
            message: `❌ ไม่พบสนาม: ${venue}`,
          };
        }
      } else {
        // Get first venue with payment link
        const venues = await VenueRepository.findActiveVenues(groupId);
        venueData = venues.find(v => v.paymentLink);

        if (!venueData) {
          return {
            success: false,
            message: '❌ ไม่พบลิงค์ชำระเงิน',
          };
        }
      }

      if (!venueData.paymentLink) {
        return {
          success: false,
          message: `❌ ไม่มีลิงค์ชำระเงินสำหรับ ${venue}`,
        };
      }

      return {
        success: true,
        link: venueData.paymentLink,
        message: `✅ ได้รับลิงค์ชำระเงิน`,
      };
    } catch (error) {
      console.error('❌ Error getting payment link:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการดึงลิงค์',
      };
    }
  }

  /**
   * Add venue
   */
  static async addVenue(
    groupId: string,
    name: string,
    roomLink: string,
    paymentLink?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if venue already exists
      const existing = await VenueRepository.findByName(name, groupId);

      if (existing) {
        return {
          success: false,
          message: `❌ สนาม ${name} มีอยู่แล้ว`,
        };
      }

      // Create venue
      await VenueRepository.create({
        name,
        roomLink,
        paymentLink,
        isActive: true,
        groupId,
      });

      console.log('✅ Venue added:', name);

      return {
        success: true,
        message: `✅ เพิ่มสนาม ${name} เรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error adding venue:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการเพิ่มสนาม',
      };
    }
  }

  /**
   * Update venue
   */
  static async updateVenue(
    groupId: string,
    name: string,
    roomLink?: string,
    paymentLink?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const venue = await VenueRepository.findByName(name, groupId);

      if (!venue) {
        return {
          success: false,
          message: `❌ ไม่พบสนาม: ${name}`,
        };
      }

      const updateData: any = {};

      if (roomLink) {
        updateData.roomLink = roomLink;
      }

      if (paymentLink) {
        updateData.paymentLink = paymentLink;
      }

      await VenueRepository.update(venue._id!, updateData);

      console.log('✅ Venue updated:', name);

      return {
        success: true,
        message: `✅ อัปเดตสนาม ${name} เรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error updating venue:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการอัปเดตสนาม',
      };
    }
  }

  /**
   * Delete venue
   */
  static async deleteVenue(
    groupId: string,
    name: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const venue = await VenueRepository.findByName(name, groupId);

      if (!venue) {
        return {
          success: false,
          message: `❌ ไม่พบสนาม: ${name}`,
        };
      }

      await VenueRepository.delete(venue._id!);

      console.log('✅ Venue deleted:', name);

      return {
        success: true,
        message: `✅ ลบสนาม ${name} เรียบร้อย`,
      };
    } catch (error) {
      console.error('❌ Error deleting venue:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการลบสนาม',
      };
    }
  }

  /**
   * List all venues
   */
  static async listVenues(groupId: string): Promise<{
    success: boolean;
    venues?: any[];
    message: string;
  }> {
    try {
      const venues = await VenueRepository.findActiveVenues(groupId);

      if (venues.length === 0) {
        return {
          success: false,
          message: '❌ ไม่มีสนามแทง',
        };
      }

      return {
        success: true,
        venues,
        message: `✅ มีสนามแทง ${venues.length} สนาม`,
      };
    } catch (error) {
      console.error('❌ Error listing venues:', error);
      return {
        success: false,
        message: '❌ เกิดข้อผิดพลาดในการดึงรายชื่อสนาม',
      };
    }
  }
}
