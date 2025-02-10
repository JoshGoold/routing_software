const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

async function getAvailableSlots(longitude, latitude) {
  try {
    const today = new Date().setHours(0, 0, 0, 0);

    // Step 1: Find bookings near the location
    const bookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: 20000, // 20 km radius
        },
      },
      date: { $gte: today },
    }).populate("van");

    // Step 2: If no bookings exist, return empty arrays
    if (bookings.length === 0) {
      return { available: [], possible: [] };
    }

    // Step 3: Fetch schedules for the same vans and dates
    const bookingDates = bookings.map(b => b.date);
    const vanIds = bookings.map(b => b.van._id);
    
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $in: bookingDates },
    }).populate("bookings");

    let available = [];
    let possible = [];

    // Step 4: Process schedules and find available time slots
    for (const schedule of schedules) {
      const availTimes = await findAvailableTimes(schedule);

      // Create an object with available time slots
      const scheduleWithTimes = {
        ...schedule.toObject(),
        availTimes,
      };

      // Categorize schedules based on the number of bookings
      if (schedule.bookings.length < 4) {
        available.push(scheduleWithTimes);
      } else if (schedule.bookings.length === 4) {
        possible.push(scheduleWithTimes);
      }
    }

    return { available, possible };
  } catch (e) {
    console.error("Error fetching available slots:", e);
    return { available: [], possible: [] };
  }
}

module.exports = getAvailableSlots;
