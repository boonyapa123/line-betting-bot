/**
 * Venue Model - สนามแทง
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IVenue } from '../types/models';

export interface IVenueDocument extends IVenue, Document {}

const VenueSchema = new Schema<IVenueDocument>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    roomLink: {
      type: String,
      required: true,
    },
    paymentLink: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
VenueSchema.index({ groupId: 1, isActive: 1 });
VenueSchema.index({ groupId: 1, name: 1 });

export const Venue = mongoose.model<IVenueDocument>('Venue', VenueSchema);

/**
 * Venue Repository - Data access layer
 */
export class VenueRepository {
  /**
   * Create a new venue
   */
  static async create(venueData: IVenue): Promise<IVenueDocument> {
    const venue = new Venue(venueData);
    return await venue.save();
  }

  /**
   * Find venue by ID
   */
  static async findById(id: string): Promise<IVenueDocument | null> {
    return await Venue.findById(id);
  }

  /**
   * Find venue by name
   */
  static async findByName(
    name: string,
    groupId: string
  ): Promise<IVenueDocument | null> {
    return await Venue.findOne({ name, groupId });
  }

  /**
   * Find all venues by group
   */
  static async findByGroup(groupId: string): Promise<IVenueDocument[]> {
    return await Venue.find({ groupId }).sort({ createdAt: -1 });
  }

  /**
   * Find all active venues
   */
  static async findActiveVenues(groupId: string): Promise<IVenueDocument[]> {
    return await Venue.find({ groupId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Find all inactive venues
   */
  static async findInactiveVenues(groupId: string): Promise<IVenueDocument[]> {
    return await Venue.find({ groupId, isActive: false }).sort({ createdAt: -1 });
  }

  /**
   * Update venue
   */
  static async update(
    id: string,
    updateData: Partial<IVenue>
  ): Promise<IVenueDocument | null> {
    return await Venue.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Update venue status
   */
  static async updateStatus(
    id: string,
    isActive: boolean
  ): Promise<IVenueDocument | null> {
    return await Venue.findByIdAndUpdate(id, { isActive }, { new: true });
  }

  /**
   * Delete venue
   */
  static async delete(id: string): Promise<boolean> {
    const result = await Venue.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Check if venue exists
   */
  static async exists(name: string, groupId: string): Promise<boolean> {
    const venue = await Venue.findOne({ name, groupId });
    return venue !== null;
  }

  /**
   * Get venue count
   */
  static async getCount(groupId: string): Promise<number> {
    return await Venue.countDocuments({ groupId, isActive: true });
  }

  /**
   * Get all venue names
   */
  static async getVenueNames(groupId: string): Promise<string[]> {
    const venues = await Venue.find({ groupId, isActive: true }, { name: 1 });
    return venues.map(v => v.name);
  }
}
