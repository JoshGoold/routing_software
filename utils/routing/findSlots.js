const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

// Configurable constants
const MAX_DISTANCE = 30000; // 30 km radius
const MAX_BOOKINGS_AVAILABLE = 3; // Threshold for "available" vs "possible"

/**
 * Get available time slots near a location based on vans with nearby bookings.
 * @param {number} longitude - Longitude of the target location
 * @param {number} latitude - Latitude of the target location
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.maxDistance] - Max distance in meters (default: 30000)
 * @returns {Promise<{ available: Array, possible: Array }>}
 */
async function getAvailableSlots(longitude, latitude, { maxDistance = MAX_DISTANCE } = {}) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Searching slots near [${longitude}, ${latitude}] from ${today}, maxDistance: ${maxDistance}m`);

    // Step 1: Find nearby bookings
    const nearbyBookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: maxDistance,
        },
      },
      date: { $gte: today },
    })
      .populate("van", "_id")
      .select("date van")
      .lean(); // Faster query with plain objects

    console.log(`Found ${nearbyBookings.length} nearby bookings`);

    if (nearbyBookings.length === 0) {
      return { available: [], possible: [] };
    }

    // Step 2: Extract unique van IDs and dates
    const vanIds = [...new Set(nearbyBookings.map(b => b.van._id.toString()))];
    const bookingDates = [...new Set(nearbyBookings.map(b => b.date.toISOString().split("T")[0]))];

    console.log(`Extracted ${vanIds.length} vans and ${bookingDates.length} dates`);

    // Step 3: Fetch schedules for these vans and dates
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $in: bookingDates },
    })
      .populate("bookings")
      .lean();

    console.log(`Found ${schedules.length} schedules`);

    // Step 4: Compute available times in parallel
    const schedulePromises = schedules.map(async (schedule) => {
      const availTimes = await findAvailableTimes(schedule, `${latitude},${longitude}`);
      if (availTimes.length === 0) return null;

      return {
        scheduleId: schedule._id,
        date: schedule.date,
        van: schedule.van,
        availTimes,
        bookingCount: schedule.bookings.length,
      };
    });

    const results = (await Promise.all(schedulePromises)).filter(Boolean);

    // Step 5: Categorize and sort
    const available = [];
    const possible = [];

    results.forEach((result) => {
      const slot = {
        scheduleId: result.scheduleId,
        date: result.date,
        van: result.van,
        availableTimes: result.availTimes, // Renamed for clarity
      };

      if (result.bookingCount <= MAX_BOOKINGS_AVAILABLE) {
        available.push(slot);
      } else {
        possible.push(slot);
      }
    });

    // Sort by date and first available time
    const sortSlots = (a, b) => (
      a.date - b.date || a.availableTimes[0].start.localeCompare(b.availableTimes[0].start)
    );
    available.sort(sortSlots);
    possible.sort(sortSlots);

    console.log(`Returning ${available.length} available and ${possible.length} possible slots`);

    return { available, possible };
  } catch (error) {
    console.error("Error in getAvailableSlots:", error.message, error.stack);
    throw new Error("Failed to fetch available slots"); // Rethrow for upstream handling
  }
}

module.exports = getAvailableSlots;