const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");

const defaultTimes = [
    { start: "08:00:00", end: "10:00:00" },
    { start: "11:00:00", end: "13:00:00" },
    { start: "14:00:00", end: "16:00:00" },
];

function parseTime(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    return hours * 60 + minutes; // Convert to minutes for easy comparison
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}:00`;
}

async function findAvailableTimes(schedule) {
    if (schedule.bookings.length === 0) return defaultTimes;

    const takenTimes = schedule.bookings.map((booking) => ({
        start: parseTime(booking.time),
        end: parseTime(booking.expectedCompletionTime),
    }));

    takenTimes.sort((a, b) => a.start - b.start);

    const availableTimes = [];
    let lastEnd = parseTime("08:00:00"); // Start of working hours

    for (const slot of takenTimes) {
        if (slot.start > lastEnd) {
            availableTimes.push({ start: formatTime(lastEnd), end: formatTime(slot.start) });
        }
        lastEnd = Math.max(lastEnd, slot.end);
    }

    // Check for remaining time after last booking
    const endOfDay = parseTime("16:00:00");
    if (lastEnd < endOfDay) {
        availableTimes.push({ start: formatTime(lastEnd), end: formatTime(endOfDay) });
    }

    return availableTimes;
}

module.exports = findAvailableTimes;