const Booking = require("../../models/BookingSchema");
const Schedule = require("../../models/ScheduleSchema");
const findTimeAndDistance = require("./findDistanceBetween.js");

// Default appointment slots
const DEFAULT_TIMES = [
    { start: "08:00:00", end: "10:00:00" },
    { start: "11:00:00", end: "13:00:00" },
    { start: "14:00:00", end: "16:00:00" },
];

const APPOINTMENT_DURATION = 120; // 2 hours in minutes
const START_OF_DAY = "08:00:00";
const END_OF_DAY = "16:00:00";
const MAX_TRAVEL_BUFFER = 60; // Max travel time buffer in minutes
const EXTRA_BUFFER_TIME = 20; // Extra buffer time in minutes between appointments

/** Converts HH:MM:SS to minutes */
const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return NaN;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

/** Converts minutes to HH:MM:SS */
const formatTime = (minutes) => {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hours}:${mins}:00`;
};

/** Parses time like "1 hour 30 mins" into minutes */
const parseTravelTime = (travelTimeStr) => {
    if (!travelTimeStr || typeof travelTimeStr !== "string") return 0;
    
    let totalMinutes = 0;
    const hourMatch = travelTimeStr.match(/(\d+)\s*hour/);
    const minuteMatch = travelTimeStr.match(/(\d+)\s*min/);

    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);

    return totalMinutes;
};

/** Round the time to the nearest 5-minute increment */
const roundToNearest5 = (minutes) => {
    return Math.round(minutes / 5) * 5;
};

async function findAvailableTimes(schedule, newBookingLocation = "43.8975974,-78.8635999") {
    if (!schedule.bookings.length) return DEFAULT_TIMES;

    // Fetch travel times in parallel
    const travelTimes = await Promise.all(
        schedule.bookings.map(async (booking) => {
            try {
                const cords1 = `${booking.location.coordinates[1]},${booking.location.coordinates[0]}`;
                const travelData = await findTimeAndDistance(cords1, newBookingLocation);
                
                if (!travelData || typeof travelData.travelTime !== "string") {
                    console.error(`❌ Invalid travel time data:`, travelData);
                    return 0; // Return 0 if no valid data
                }

                return parseTravelTime(travelData.travelTime); // Use the new parsing function
            } catch (error) {
                console.error("Error fetching travel time:", error);
                return 0;
            }
        })
    );

    // Process bookings into blocked time slots
    const takenTimes = schedule.bookings.map((booking, index) => {
        const completionTime = booking.expectedCompletionTime;
        if (!completionTime || typeof completionTime !== "string") {
            console.error(`❌ Invalid completion time for booking:`, booking);
        }

        const travelBuffer = Math.min(Math.ceil(travelTimes[index] || 0), MAX_TRAVEL_BUFFER);
        const start = parseTime(booking.time);
        const end = parseTime(completionTime) + travelBuffer;

        // Round start and end to nearest 5 minutes
        const roundedStart = roundToNearest5(start);
        const roundedEnd = roundToNearest5(end);

        console.log(`🕒 Booking ${booking._id} | Start: ${roundedStart} | Completion: ${completionTime} (${parseTime(completionTime)}) | Travel Buffer: ${travelBuffer}`);
        return { start: roundedStart, end: roundedEnd };
    });

    // Sort blocked slots
    takenTimes.sort((a, b) => a.start - b.start);

    // Compute available time slots
    return computeAvailableSlots(takenTimes, parseTime(START_OF_DAY), parseTime(END_OF_DAY));
}

function computeAvailableSlots(takenTimes, startOfDay, endOfDay) {
    let lastEnd = startOfDay;
    const availableTimes = [];

    takenTimes.forEach(({ start, end }) => {
        // Ensure at least 20 minutes buffer between appointments
        if (start > lastEnd + EXTRA_BUFFER_TIME) {
            addFixedSlots(availableTimes, lastEnd + EXTRA_BUFFER_TIME, start);
        }
        lastEnd = Math.max(lastEnd, end);
    });

    if (lastEnd < endOfDay) {
        addFixedSlots(availableTimes, lastEnd + EXTRA_BUFFER_TIME, endOfDay);
    }

    return availableTimes;
}

function addFixedSlots(availableTimes, start, end) {
    while (start + APPOINTMENT_DURATION <= end) {
        availableTimes.push({
            start: formatTime(start),
            end: formatTime(start + APPOINTMENT_DURATION),
        });
        start += APPOINTMENT_DURATION;
    }
}

module.exports = findAvailableTimes;
