const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        city: { type: String, required: true },
        country: { type: String, required: true }
    },
    client: { type: mongoose.SchemaTypes.ObjectId, ref: "Client", required: true },
    date: { type: Date, required: true }, // Date only (no time)
    time: { type: String, required: true }, // Example: "14:30" (2:30 PM)
    breed: { type: String, required: true },
    price: { type: Number },
    expectedCompletionTime: { type: String, required: true, default: 2 },
    createdAt: { type: Date, default: Date.now },
    van: { type: mongoose.SchemaTypes.ObjectId, ref: "Van", required: true }
});

// Create a geospatial index for location
BookingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Booking", BookingSchema);
