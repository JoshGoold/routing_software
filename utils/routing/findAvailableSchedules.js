const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");

async function getUpcomingSchedules() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        twoWeeksLater.setHours(23, 59, 59, 999);

        // Fetch all schedules, including bookings
        const schedules = await Schedule.find({
            date: { $gte: today, $lte: twoWeeksLater }
        }).populate("bookings"); // Ensure we get bookings data

        // Store grouped available time slots
        const timeSlotMap = new Map();

        for (let schedule of schedules) {
            const availTimes = await findAvailableTimes(schedule) || []; // Ensure availTimes is an array

            for (let time of availTimes) {
                const key = `${schedule.date.toISOString().split("T")[0]}T${time.start}`;

                // Get booked vans at this specific time slot
                const bookedVans = new Set(schedule.bookings.map(b => b.van.toString()));

                if (!timeSlotMap.has(key)) {
                    timeSlotMap.set(key, {
                        date: schedule.date,
                        start: time.start,
                        end: time.end,
                        availableVans: new Set() // Use a Set to store unique van IDs
                    });
                }

                // Only add vans that are NOT already booked at this time slot
                if (!bookedVans.has(schedule.van.toString())) {
                    timeSlotMap.get(key).availableVans.add(schedule.van.toString());
                }
            }
        }

        // Convert map to an array and return
        return Array.from(timeSlotMap.values()).map(slot => ({
            ...slot,
            availableVans: Array.from(slot.availableVans) // Convert Set back to array
        }));

    } catch (error) {
        console.error("Error fetching available schedules:", error);
        return [];
    }
}

module.exports = getUpcomingSchedules;
