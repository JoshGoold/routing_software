const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

async function getAvailableSlots(longitude, latitude) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date filtering

    console.log(`Searching for bookings near: [${longitude}, ${latitude}] from today: ${today}`);

    // Step 1: Find bookings near the location (optimized)
    const bookings = await Booking.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
          $maxDistance: 50000, // Increased radius to 50 km for better results
        },
      },
      date: { $gte: today },
    })
      .populate("van", "_id") // Fetch only van IDs
      .select("date van");

    console.log(`Found ${bookings.length} nearby bookings`);

    if (bookings.length === 0) {
      return { available: [], possible: [] };
    }

    // Step 2: Extract unique van IDs and formatted booking dates
    const bookingDates = [...new Set(bookings.map((b) => b.date.toISOString().split("T")[0]))];
    const vanIds = [...new Set(bookings.map((b) => b.van._id.toString()))];

    console.log(`Extracted ${vanIds.length} unique vans and ${bookingDates.length} booking dates`);

    // Step 3: Fetch schedules for these vans and dates
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $in: bookingDates }, // Ensure date format matches MongoDB storage
    }).populate("bookings");

    console.log(`Found ${schedules.length} schedules for matching vans and dates`);

    let available = [];
    let possible = [];

    // Step 4: Process schedules and find available time slots
    for (const schedule of schedules) {
      const availTimes = await findAvailableTimes(schedule, `${latitude},${longitude}`);

      console.log(`Schedule ${schedule._id} has ${availTimes.length} available times`);

      if (availTimes.length > 0) {
        const scheduleWithTimes = {
          ...schedule.toObject(),
          availTimes,
        };

        // Categorize based on the number of bookings
        if (schedule.bookings.length < 3) {
          available.push(scheduleWithTimes);
        } else if (schedule.bookings.length === 3) {
          available.push(scheduleWithTimes);
        }
      }
    }

    console.log(`Returning ${available.length} available and ${possible.length} possible schedules`);

    return { available, possible };
  } catch (e) {
    console.error("Error fetching available slots:", e);
    return { available: [], possible: [] };
  }
}

module.exports = getAvailableSlots;
