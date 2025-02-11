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

const APPOINTMENT_DURATION = 120; // 2 hours in minutes

async function findAvailableTimes(schedule) {
    if (schedule.bookings.length === 0) return defaultTimes;

    const takenTimes = schedule.bookings.map((booking) => ({
        start: parseTime(booking.time),
        end: parseTime(booking.expectedCompletionTime),
    }));

    takenTimes.sort((a, b) => a.start - b.start);

    const availableTimes = [];
    let lastEnd = parseTime("08:00:00"); // Start of working hours
    const endOfDay = parseTime("16:00:00"); // End of working hours

    for (const slot of takenTimes) {
        if (slot.start > lastEnd) {
            addFixedSlots(availableTimes, lastEnd, slot.start);
        }
        lastEnd = Math.max(lastEnd, slot.end);
    }

    if (lastEnd < endOfDay) {
        addFixedSlots(availableTimes, lastEnd, endOfDay);
    }

    return availableTimes;
}

/**
 * Splits time slots to ensure they do not exceed max appointment duration
 */
function addFixedSlots(availableTimes, start, end) {
    while (start + APPOINTMENT_DURATION <= end) {
        availableTimes.push({ start: formatTime(start), end: formatTime(start + APPOINTMENT_DURATION) });
        start += APPOINTMENT_DURATION; // Move to next 2-hour slot
    }
}

module.exports = findAvailableTimes;