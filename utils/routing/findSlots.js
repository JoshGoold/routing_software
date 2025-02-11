const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

async function getAvailableSlots(longitude, latitude) {
  try {
    const today = new Date().setHours(0, 0, 0, 0);

    // Step 1: Find bookings near the location (optimized)
    const bookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: 30000, // 30 km radius
        },
      },
      date: { $gte: today },
    })
      .populate("van", "_id") // Only fetch van IDs
      .select("date van");

    if (!bookings.length) {
      return { available: [], possible: [] };
    }

    // Step 2: Extract unique van IDs and booking dates
    const bookingDates = [...new Set(bookings.map((b) => b.date.toISOString()))];
    const vanIds = [...new Set(bookings.map((b) => b.van._id.toString()))];

    // Step 3: Fetch schedules for these vans and dates
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $in: bookingDates },
    }).populate("bookings");

    let available = [];
    let possible = [];

    // Step 4: Process schedules and find available time slots
    for (const schedule of schedules) {
      const availTimes = await findAvailableTimes(schedule);

      if (availTimes.length > 0) {
        const scheduleWithTimes = {
          ...schedule.toObject(),
          availTimes,
        };

        // Categorize based on the number of bookings
        if (schedule.bookings.length < 3) {
          available.push(scheduleWithTimes);
        } else if (schedule.bookings.length === 3) {
          possible.push(scheduleWithTimes);
        }
      }
    }

    return { available, possible };
  } catch (e) {
    console.error("Error fetching available slots:", e.message);
    return { available: [], possible: [] };
  }
}

module.exports = getAvailableSlots;
