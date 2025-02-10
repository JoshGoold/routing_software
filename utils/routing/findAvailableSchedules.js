
const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

async function getUpcomingSchedules() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        twoWeeksLater.setHours(23, 59, 59, 999); // End of the 14th day

        // Fetch schedules and populate their bookings
        const schedules = await Schedule.find({
            date: { $gte: today, $lte: twoWeeksLater }
        }).populate("bookings"); // Assuming `bookings` is referenced in your schema

        // Filter out schedules that have bookings
        const availableSchedules = schedules.filter(schedule => !schedule.bookings || schedule.bookings.length === 0);

        const bookingOptions = [];

        for(let schedule of availableSchedules){
            const availTimes = await findAvailableTimes(schedule);
            bookingOptions.push({...schedule.toObject(), availTimes})
        }

        return bookingOptions;

    } catch (error) {
        console.error("Error fetching available schedules:", error);
        return [];
    }
}


module.exports = getUpcomingSchedules;
