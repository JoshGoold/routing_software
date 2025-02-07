const Van = require("../../models/VanSchema");
const Schedule = require("../../models/ScheduleSchema");

async function createMonthSchedule(year, month) {
    try {
        // Step 1: Retrieve all vans
        const vans = await Van.find({});
        if (vans.length === 0) return console.log("No vans found.");

        // Step 2: Get all business days of the month
        const daysOfMonth = getDaysInCurrentMonth(year, month);

        // Step 3: Get all existing schedules for the given month
        const startOfMonth = new Date(year, month - 1, 1); // First day of the month
        const endOfMonth = new Date(year, month, 0, 23, 59, 59); // Last day of the month

        const existingSchedules = await Schedule.find({
            date: { $gte: startOfMonth, $lte: endOfMonth },
        });

        // Step 4: Convert existing schedules to a Set for quick lookup
        const existingScheduleSet = new Set(
            existingSchedules.map((sched) => `${sched.van}-${sched.date.toISOString().split("T")[0]}`)
        );

        const schedulesToInsert = [];

        for (const van of vans) {
            for (let i = 1; i <= daysOfMonth; i++) {
                const date = new Date(year, month - 1, i);
                const dayOfWeek = date.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    const scheduleKey = `${van._id}-${date.toISOString().split("T")[0]}`;

                    // Only add if it doesn't already exist
                    if (!existingScheduleSet.has(scheduleKey)) {
                        schedulesToInsert.push({
                            van: van._id,
                            date: new Date(year, month - 1, i, 8).toISOString(), // Set time to 8 AM
                        });
                    }
                }
            }
        }

        // Step 5: Insert only new schedules
        if (schedulesToInsert.length > 0) {
            await Schedule.insertMany(schedulesToInsert);
            console.log(`Successfully created ${schedulesToInsert.length} new schedules.`);
        } else {
            console.log("No new schedules needed.");
        }
    } catch (error) {
        console.error("Error creating schedules:", error);
    }
}

module.exports = createMonthSchedule;

function getDaysInCurrentMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
