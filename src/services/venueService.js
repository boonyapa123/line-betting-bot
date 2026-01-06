const Venue = require('../models/Venue');

/**
 * Get venue by name
 */
const getVenue = async (venueName) => {
  try {
    const venue = await Venue.findOne({
      name: venueName,
      isActive: true,
    });

    if (!venue) {
      return {
        success: false,
        error: `Venue "${venueName}" not found`,
      };
    }

    return {
      success: true,
      venue: {
        id: venue._id,
        name: venue.name,
        roomLink: venue.roomLink,
        paymentLink: venue.paymentLink,
      },
    };
  } catch (error) {
    console.error('Error getting venue:', error);
    return {
      success: false,
      error: 'Failed to retrieve venue',
    };
  }
};

/**
 * Get all active venues
 */
const getAllVenues = async () => {
  try {
    const venues = await Venue.find({ isActive: true }).sort({ createdAt: 1 });

    return {
      success: true,
      venues: venues.map((v) => ({
        id: v._id,
        name: v.name,
        roomLink: v.roomLink,
        paymentLink: v.paymentLink,
      })),
      count: venues.length,
    };
  } catch (error) {
    console.error('Error getting all venues:', error);
    return {
      success: false,
      error: 'Failed to retrieve venues',
    };
  }
};

/**
 * Add new venue
 */
const addVenue = async (name, roomLink, paymentLink = null) => {
  try {
    // Check if venue already exists
    const existingVenue = await Venue.findOne({ name });
    if (existingVenue) {
      return {
        success: false,
        error: `Venue "${name}" already exists`,
      };
    }

    // Validate inputs
    if (!name || !roomLink) {
      return {
        success: false,
        error: 'Venue name and room link are required',
      };
    }

    const venue = new Venue({
      name,
      roomLink,
      paymentLink,
      isActive: true,
    });

    await venue.save();

    return {
      success: true,
      venue: {
        id: venue._id,
        name: venue.name,
        roomLink: venue.roomLink,
        paymentLink: venue.paymentLink,
      },
    };
  } catch (error) {
    console.error('Error adding venue:', error);
    return {
      success: false,
      error: 'Failed to add venue',
    };
  }
};

/**
 * Update venue
 */
const updateVenue = async (venueId, updates) => {
  try {
    const venue = await Venue.findByIdAndUpdate(venueId, updates, {
      new: true,
    });

    if (!venue) {
      return {
        success: false,
        error: 'Venue not found',
      };
    }

    return {
      success: true,
      venue: {
        id: venue._id,
        name: venue.name,
        roomLink: venue.roomLink,
        paymentLink: venue.paymentLink,
        isActive: venue.isActive,
      },
    };
  } catch (error) {
    console.error('Error updating venue:', error);
    return {
      success: false,
      error: 'Failed to update venue',
    };
  }
};

/**
 * Deactivate venue
 */
const deactivateVenue = async (venueId) => {
  try {
    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { isActive: false },
      { new: true }
    );

    if (!venue) {
      return {
        success: false,
        error: 'Venue not found',
      };
    }

    return {
      success: true,
      message: `Venue "${venue.name}" deactivated`,
    };
  } catch (error) {
    console.error('Error deactivating venue:', error);
    return {
      success: false,
      error: 'Failed to deactivate venue',
    };
  }
};

module.exports = {
  getVenue,
  getAllVenues,
  addVenue,
  updateVenue,
  deactivateVenue,
};
