const mongoose = require("mongoose");
const haversine = require("haversine-distance"); // Install: npm install haversine-distance

// Define company's location
const COMPANY_LOCATION = {
    latitude: 43.8974,  // Oshawa, Canada
    longitude: -78.8662
  };

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
    // travel: {
    //     time: {type: String, required: true},
    //     distance: {type: String, required: true}
    // },
    client: { type: mongoose.SchemaTypes.ObjectId, ref: "Client", required: true },
    date: { type: Date, required: true }, 
    time: { type: String, required: true }, // Example: "14:30" (2:30 PM)
    breed: { type: String, required: true },
    price: { type: Number },
    expectedCompletionTime: { type: String, required: true, default: "2" },
    createdAt: { type: Date, default: Date.now },
    van: { type: mongoose.SchemaTypes.ObjectId, ref: "Van", required: true }
});

// Create a geospatial index for location
BookingSchema.index({ location: "2dsphere" });

// Pre-save middleware to enforce the 80km booking radius
BookingSchema.pre("save", function (next) {
    const bookingLocation = {
        latitude: this.location.coordinates[1],
        longitude: this.location.coordinates[0]
    };

    const distance = haversine(COMPANY_LOCATION, bookingLocation) / 1000; // Convert meters to km

    if (distance > 80) {
        return next(new Error("Booking location is outside the 80km service area."));
    }

    next();
});

module.exports = mongoose.model("Booking", BookingSchema);
