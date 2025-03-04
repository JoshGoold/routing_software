const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");
const Van = require("../../models/VanSchema"); // Assuming you have a Van model

async function getUpcomingSchedules() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        twoWeeksLater.setHours(23, 59, 59, 999);

        // Fetch all vans in the system
        const allVans = await Van.find().select("_id"); // Get all van IDs
        const allVanIds = new Set(allVans.map(van => van._id.toString()));

        // Fetch all schedules with bookings
        const schedules = await Schedule.find({
            date: { $gte: today, $lte: twoWeeksLater }
        }).populate("bookings");

        // Map to track all bookings by date and time (to identify booked vans)
        const bookingTimeMap = new Map(); // Key: "YYYY-MM-DDTHH:MM:SS", Value: Set of booked van IDs

        // Populate bookingTimeMap with all booked times
        for (const schedule of schedules) {
            for (const booking of schedule.bookings) {
                if (!booking.time) continue; // Skip invalid bookings
                const key = `${schedule.date.toISOString().split("T")[0]}T${booking.time}`;
                if (!bookingTimeMap.has(key)) {
                    bookingTimeMap.set(key, new Set());
                }
                bookingTimeMap.get(key).add(booking.van.toString());
            }
        }

        // Store grouped available time slots
        const timeSlotMap = new Map();

        for (const schedule of schedules) {
            const availTimes = await findAvailableTimes(schedule) || [];

            for (const time of availTimes) {
                const key = `${schedule.date.toISOString().split("T")[0]}T${time.start}`;

                // Get vans booked at this exact time across ALL schedules
                const bookedVans = bookingTimeMap.get(key) || new Set();

                if (!timeSlotMap.has(key)) {
                    timeSlotMap.set(key, {
                        date: schedule.date,
                        start: time.start,
                        end: time.end,
                        availableVans: new Set(allVanIds) // Start with all vans as potentially available
                    });
                }

                // Remove booked vans from the available set for this slot
                const slot = timeSlotMap.get(key);
                bookedVans.forEach(vanId => slot.availableVans.delete(vanId));
            }
        }

        // Convert map to array and return
        return Array.from(timeSlotMap.values())
            .filter(slot => slot.availableVans.size > 0) // Only return slots with available vans
            .map(slot => ({
                ...slot,
                availableVans: Array.from(slot.availableVans) // Convert Set to array
            }));

    } catch (error) {
        console.error("Error fetching available schedules:", error);
        return [];
    }
}

module.exports = getUpcomingSchedules;