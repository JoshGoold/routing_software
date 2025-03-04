const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

const DAYS_AHEAD = 7; // Look ahead 7 days for more opportunities
const MAX_DISTANCE = 50000; // Increased to 50 km for broader coverage

async function getAvailableSlots(longitude, latitude) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + DAYS_AHEAD);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Searching for bookings near [${longitude}, ${latitude}] from ${today} to ${endDate}`);

    // Step 1: Find bookings near the location
    const nearbyBookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: MAX_DISTANCE,
        },
      },
      date: { $gte: today, $lte: endDate }, // Broader date range
    })
      .populate("van", "_id")
      .select("date van");

    console.log(`Found ${nearbyBookings.length} nearby bookings`);

    if (nearbyBookings.length === 0) {
      return { available: [], possible: [] };
    }

    // Step 2: Extract unique van IDs and date range
    const vanIds = [...new Set(nearbyBookings.map(b => b.van._id.toString()))];
    const bookingDates = nearbyBookings.map(b => b.date.toISOString().split("T")[0]);
    const uniqueDates = [...new Set([
      ...bookingDates,
      ...Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d.toISOString().split("T")[0];
      }),
    ])]; // Include all days in range, not just booked ones

    console.log(`Extracted ${vanIds.length} unique vans and ${uniqueDates.length} dates`);

    // Step 3: Fetch schedules for these vans and dates
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $gte: today, $lte: endDate },
    }).populate("bookings").lean();

    console.log(`Found ${schedules.length} schedules`);

    const available = [];
    const possible = [];

    // Step 4: Process schedules and find available time slots
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

    // Step 5: Categorize based on booking count
    results.forEach((result) => {
      const slot = {
        scheduleId: result.scheduleId,
        date: result.date,
        van: result.van,
        availTimes: result.availTimes,
      };

      if (result.bookingCount < 5) { // Increased threshold for more options
        available.push(slot);
      } else {
        possible.push(slot); // Keep schedules with more bookings as fallback
      }
    });

    // Sort for consistency
    available.sort((a, b) => a.date - b.date || a.availTimes[0].start.localeCompare(b.availTimes[0].start));
    possible.sort((a, b) => a.date - b.date || a.availTimes[0].start.localeCompare(b.availTimes[0].start));

    console.log(`Returning ${available.length} available and ${possible.length} possible slots`);

    return { available, possible };
  } catch (e) {
    console.error("Error fetching available slots:", e.message, e.stack);
    return { available: [], possible: [] };
  }
}

module.exports = getAvailableSlots;