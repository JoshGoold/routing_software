const express = require("express");
const findSlots = require("../../utils/routing/findSlots");
const getUpcomingSchedules = require("../../utils/routing/findAvailableSchedules");
const getGrokCheck = require("../../api/grokCheck");

const router = express.Router();

router.get("/book", async (req, res) => {
    const { long, lat } = req.query;
    try {
        const { available, possible } = await findSlots(long, lat);

        if (available.length === 0) {
            const emptySchedules = await getUpcomingSchedules();
            if (emptySchedules) {
                console.log(emptySchedules);
                return res.send({
                    Message: "We've found some possible booking times",
                    Available: emptySchedules,
                    Success: true,
                });
            } else {
                return res.status(404).send({ Message: "No available times, please try again another day", Success: false });
            }
        }

        console.log(available);
        console.log(possible);

        const confirmedAvailable = await getGrokCheck(long, lat, available);

        // Filter to only include schedules with pre-existing bookings
        const bookedSchedules = confirmedAvailable.filter(schedule => schedule.bookings && schedule.bookings.length > 0);

        // Use today as the start date for the 14-day window
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const fillSchedules = await getUpcomingSchedules(true, startDate.toISOString().split("T")[0]);

        // Merge bookedSchedules with priority, overriding entire days
        const allAvailableMap = new Map();
        const bookedDays = new Set();

        // Step 1: Add bookedSchedules first, marking their days as taken
        for (const schedule of bookedSchedules) {
            const dateKey = schedule.date.split("T")[0];
            bookedDays.add(dateKey); // Mark this day as fully taken
            for (const time of schedule.availTimes) {
                const key = `${dateKey}T${time.start}`;
                allAvailableMap.set(key, {
                    _id: schedule._id,
                    date: schedule.date,
                    van: schedule.van,
                    bookings: schedule.bookings,
                    start: time.start,
                    end: time.end
                });
            }
        }

        // Step 2: Add fillSchedules only for days NOT in bookedSchedules
        for (const slot of fillSchedules) {
            const dateKey = slot.date.toISOString().split("T")[0];
            if (!bookedDays.has(dateKey)) { // Skip entire day if booked
                const key = `${dateKey}T${slot.start}`;
                allAvailableMap.set(key, {
                    date: slot.date,
                    start: slot.start,
                    end: slot.end,
                    availableVans: slot.availableVans
                });
            }
        }

        const allAvailable = Array.from(allAvailableMap.values());

        return res.send({
            Message: "We've found some possible booking times",
            Available: allAvailable,
            Possible: possible,
            Success: true,
        });
    } catch (error) {
        console.error("Error occurred while finding booking times: ", error);
        return res.status(500).send({
            Message: "Server error occurred",
            error: error.message,
            Success: false,
        });
    }
});

module.exports = router;