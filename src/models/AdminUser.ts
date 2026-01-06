/**
 * AdminUser Model - ผู้ดูแลระบบ
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IAdminUser } from '../types/models';

export interface IAdminUserDocument extends IAdminUser, Document {}

const AdminUserSchema = new Schema<IAdminUserDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    lineName: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          'manage_rounds',
          'view_reports',
          'set_results',
          'manage_venues',
        ],
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
AdminUserSchema.index({ groupId: 1, userId: 1 });
AdminUserSchema.index({ groupId: 1, createdAt: -1 });

export const AdminUser = mongoose.model<IAdminUserDocument>(
  'AdminUser',
  AdminUserSchema
);

/**
 * AdminUser Repository - Data access layer
 */
export class AdminUserRepository {
  /**
   * Create a new admin user
   */
  static async create(adminData: IAdminUser): Promise<IAdminUserDocument> {
    const admin = new AdminUser(adminData);
    return await admin.save();
  }

  /**
   * Find admin by ID
   */
  static async findById(id: string): Promise<IAdminUserDocument | null> {
    return await AdminUser.findById(id);
  }

  /**
   * Find admin by user ID and group ID
   */
  static async findByUserAndGroup(
    userId: string,
    groupId: string
  ): Promise<IAdminUserDocument | null> {
    return await AdminUser.findOne({ userId, groupId });
  }

  /**
   * Find all admins in group
   */
  static async findByGroup(groupId: string): Promise<IAdminUserDocument[]> {
    return await AdminUser.find({ groupId }).sort({ createdAt: -1 });
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string, groupId: string): Promise<boolean> {
    const admin = await AdminUser.findOne({ userId, groupId });
    return admin !== null;
  }

  /**
   * Check if user has permission
   */
  static async hasPermission(
    userId: string,
    groupId: string,
    permission: string
  ): Promise<boolean> {
    const admin = await AdminUser.findOne({ userId, groupId });
    return admin ? admin.permissions.includes(permission) : false;
  }

  /**
   * Get user permissions
   */
  static async getPermissions(
    userId: string,
    groupId: string
  ): Promise<string[]> {
    const admin = await AdminUser.findOne({ userId, groupId });
    return admin ? admin.permissions : [];
  }

  /**
   * Add permission
   */
  static async addPermission(
    userId: string,
    groupId: string,
    permission: string
  ): Promise<IAdminUserDocument | null> {
    return await AdminUser.findOneAndUpdate(
      { userId, groupId },
      { $addToSet: { permissions: permission } },
      { new: true }
    );
  }

  /**
   * Remove permission
   */
  static async removePermission(
    userId: string,
    groupId: string,
    permission: string
  ): Promise<IAdminUserDocument | null> {
    return await AdminUser.findOneAndUpdate(
      { userId, groupId },
      { $pull: { permissions: permission } },
      { new: true }
    );
  }

  /**
   * Update admin
   */
  static async update(
    id: string,
    updateData: Partial<IAdminUser>
  ): Promise<IAdminUserDocument | null> {
    return await AdminUser.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Delete admin
   */
  static async delete(id: string): Promise<boolean> {
    const result = await AdminUser.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Delete admin by user and group
   */
  static async deleteByUserAndGroup(
    userId: string,
    groupId: string
  ): Promise<boolean> {
    const result = await AdminUser.findOneAndDelete({ userId, groupId });
    return result !== null;
  }

  /**
   * Get admin count in group
   */
  static async getCount(groupId: string): Promise<number> {
    return await AdminUser.countDocuments({ groupId });
  }

  /**
   * Get admins with specific permission
   */
  static async findByPermission(
    groupId: string,
    permission: string
  ): Promise<IAdminUserDocument[]> {
    return await AdminUser.find({
      groupId,
      permissions: permission,
    });
  }
}
