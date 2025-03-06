const Schedule = require("../../models/ScheduleSchema");
const findAvailableTimes = require("./calculateAvailableBookingTime");
const Van = require("../../models/VanSchema");

async function getUpcomingSchedules(method, date) {
    try {
        let startDate;
        if (method && date) {
            startDate = new Date(date); // Fixed: Added 'new'
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        }

        const twoWeeksLater = new Date(startDate);
        twoWeeksLater.setDate(startDate.getDate() + 14);
        twoWeeksLater.setHours(23, 59, 59, 999);

        const allVans = await Van.find().select("_id");
        const allVanIds = new Set(allVans.map(van => van._id.toString()));

        const schedules = await Schedule.find({
            date: { $gte: startDate, $lte: twoWeeksLater }
        }).populate("bookings");

        const bookingTimeMap = new Map();
        for (const schedule of schedules) {
            for (const booking of schedule.bookings) {
                if (!booking.time) continue;
                const key = `${schedule.date.toISOString().split("T")[0]}T${booking.time}`;
                if (!bookingTimeMap.has(key)) {
                    bookingTimeMap.set(key, new Set());
                }
                bookingTimeMap.get(key).add(booking.van.toString());
            }
        }

        const timeSlotMap = new Map();
        for (const schedule of schedules) {
            const availTimes = await findAvailableTimes(schedule) || [];
            for (const time of availTimes) {
                const key = `${schedule.date.toISOString().split("T")[0]}T${time.start}`;
                const bookedVans = bookingTimeMap.get(key) || new Set();
                if (!timeSlotMap.has(key)) {
                    timeSlotMap.set(key, {
                        date: schedule.date,
                        start: time.start,
                        end: time.end,
                        availableVans: new Set(allVanIds)
                    });
                }
                const slot = timeSlotMap.get(key);
                bookedVans.forEach(vanId => slot.availableVans.delete(vanId));
            }
        }

        return Array.from(timeSlotMap.values())
            .filter(slot => slot.availableVans.size > 0)
            .map(slot => ({
                date: slot.date,
                start: slot.start,
                end: slot.end,
                availableVans: Array.from(slot.availableVans)
            }));
    } catch (error) {
        console.error("Error fetching available schedules:", error);
        return [];
    }
}

module.exports = getUpcomingSchedules;