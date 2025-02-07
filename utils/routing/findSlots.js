const Van = require("../../models/VanSchema");
const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");

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

    // Step 2: If no bookings exist, find schedules with <= 3 bookings
    if (bookings.length === 0) {
     return {available: [], possible: []}
    }

    // Step 3: Fetch schedules in one query
    const bookingDates = bookings.map(b => b.date);
    const vanIds = bookings.map(b => b.van._id);
    
    const schedules = await Schedule.find({
      van: { $in: vanIds },
      date: { $in: bookingDates },
    }).populate("bookings");

    let available = [];
    let possible = [];
    
    // Step 4: Categorize based on booking count and calculate recommended time
    schedules.forEach(schedule => {
      const lastBooking = schedule.bookings[schedule.bookings.length - 1];

      // If there is a last booking, calculate the recommended time
      let recommendedTime = null;
      if (lastBooking && lastBooking.expectedCompletionTime) {
        const hours = Number(lastBooking.expectedCompletionTime.split(":")[0]);
         recommendedTime = `${(hours+1)}:00:00`; // Extract time in HH:MM format
      }

      // Create an object to hold the schedule with the recommended time
      const scheduleWithRecommendedTime = {
        ...schedule.toObject(),
        recommendedTime,
      };

      // Categorize schedules based on the number of bookings
      if (schedule.bookings.length < 4) {
        available.push(scheduleWithRecommendedTime);
      } else if (schedule.bookings.length === 4) {
        possible.push(scheduleWithRecommendedTime);
      }
    });

    return { available, possible };
  } catch (e) {
    console.error("Error fetching available slots:", e);
    return { available: [], possible: [] };
  }
}

module.exports = getAvailableSlots;
