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
const EXTRA_BUFFER_TIME = 30; // Extra buffer time in minutes between appointments

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
const roundToNearest5 = (minutes) => Math.round(minutes / 5) * 5;

async function findAvailableTimes(schedule, newBookingLocation = "43.8975974,-78.8635999") {

    if (schedule.bookings.length === 0) return DEFAULT_TIMES;

    // Fetch travel times in parallel
    const travelTimes = await Promise.all(
        schedule.bookings.map(async (booking) => {
            try {
                if (!booking.location || !booking.location.coordinates) {
                    console.error("❌ Booking has missing coordinates:", booking);
                    return 0;
                }
                
                const cords1 = `${booking.location.coordinates[1]},${booking.location.coordinates[0]}`;
                const travelData = await findTimeAndDistance(cords1, newBookingLocation);
                
                if (!travelData || typeof travelData.travelTime !== "string") {
                    console.error(`❌ Invalid travel time data:`, travelData);
                    return 0;
                }

                return parseTravelTime(travelData.travelTime);
            } catch (error) {
                console.error("Error fetching travel time:", error);
                return 0;
            }
        })
    );

    // Process bookings into blocked time slots
    const takenTimes = schedule.bookings.map((booking, index) => {
        if (!booking.time || !booking.expectedCompletionTime) {
            console.error("❌ Booking missing required time fields:", booking);
            return null;
        }
        
        const travelBuffer = Math.min(Math.ceil(travelTimes[index] || 0), MAX_TRAVEL_BUFFER);
        const start = parseTime(booking.time);
        const end = parseTime(booking.expectedCompletionTime) + travelBuffer;
        
        return { start: roundToNearest5(start), end: roundToNearest5(end) };
    }).filter(Boolean); // Remove null values

    // Sort blocked slots
    takenTimes.sort((a, b) => a.start - b.start);

    return computeAvailableSlots(takenTimes, parseTime(START_OF_DAY), parseTime(END_OF_DAY));
}

function computeAvailableSlots(takenTimes, startOfDay, endOfDay) {
    let lastEnd = startOfDay;
    const availableTimes = [];

    takenTimes.forEach(({ start, end }) => {
        if (lastEnd + APPOINTMENT_DURATION <= start) {
            availableTimes.push({
                start: formatTime(lastEnd),
                end: formatTime(lastEnd + APPOINTMENT_DURATION),
            });
        }
        lastEnd = Math.max(lastEnd, end + EXTRA_BUFFER_TIME);
    });

    if (lastEnd + APPOINTMENT_DURATION <= endOfDay) {
        availableTimes.push({
            start: formatTime(lastEnd),
            end: formatTime(lastEnd + APPOINTMENT_DURATION),
        });
    }

    return availableTimes;
}

module.exports = findAvailableTimes;
