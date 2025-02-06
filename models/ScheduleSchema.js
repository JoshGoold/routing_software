const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    date: { type: Date, required: true, index: true }, // Index to improve queries
    van: { type: mongoose.SchemaTypes.ObjectId, ref: "Van", required: true },
    bookings: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Booking" }]
});

// Ensure a van has only one schedule per date
ScheduleSchema.index({ van: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Schedule", ScheduleSchema);
