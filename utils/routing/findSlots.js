const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

const DAYS_AHEAD = 7; // Configurable: look ahead 7 days
const MAX_DISTANCE = 30000; // 30 km radius

async function getAvailableSlots(longitude, latitude) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + DAYS_AHEAD);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Searching slots near [${longitude}, ${latitude}] from ${today} to ${endDate}`);

    // Step 1: Fetch all vans
    const allVans = await Van.find().select("_id");
    const allVanIds = allVans.map(van => van._id.toString());

    // Step 2: Find nearby bookings for prioritization
    const nearbyBookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: MAX_DISTANCE,
        },
      },
      date: { $gte: today, $lte: endDate },
    })
      .populate("van", "_id")
      .select("date van location");

    console.log(`Found ${nearbyBookings.length} nearby bookings`);

    // Step 3: Fetch all schedules for the date range
    const schedules = await Schedule.find({
      date: { $gte: today, $lte: endDate },
      van: { $in: allVanIds },
    }).populate("bookings").lean();

    console.log(`Found ${schedules.length} schedules`);

    if (schedules.length === 0) {
      return { available: [], possible: [] };
    }

    // Step 4: Process schedules and compute available times
    const available = [];
    const possible = [];
    const nearbyVanIds = new Set(nearbyBookings.map(b => b.van._id.toString()));

    const schedulePromises = schedules.map(async (schedule) => {
      const availTimes = await findAvailableTimes(schedule, `${latitude},${longitude}`);
      if (availTimes.length === 0) return null;

      const isNear = nearbyVanIds.has(schedule.van.toString());
      return {
        ...schedule,
        availTimes,
        isNear, // Flag for prioritization
        bookingCount: schedule.bookings.length,
      };
    });

    const results = (await Promise.all(schedulePromises)).filter(Boolean);

    // Step 5: Categorize and sort
    results.forEach((result) => {
      const slot = {
        scheduleId: result._id,
        date: result.date,
        van: result.van,
        availTimes: result.availTimes,
      };

      if (result.isNear && result.bookingCount < 4) {
        available.push(slot); // Prioritize nearby vans with fewer bookings
      } else {
        possible.push(slot); // Other options
      }
    });

    // Sort available by date and time for consistency
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