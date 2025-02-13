const express = require("express");
const Booking = require("../../models/BookingSchema");
const Client = require("../../models/ClientSchema");
const Schedule = require("../../models/ScheduleSchema");

const router = express.Router();

router.post("/create-booking", async (req, res) => {
  const {
    long,
    lat,
    city,
    country,
    date,
    time,
    breed,
    price,
    expectedCompletionTime,
    van_id,
    email,
    phone,
    name,
  } = req.body;

  try {
    // Step 1: Check if client already exists (avoid duplicates)
    let client = await Client.findOne({ email });
    if (!client) {
      client = new Client({ name, phone, email });
      await client.save();
    }

    // Step 2: Create the booking
    const booking = new Booking({
      location: {
        type: "Point",  // Ensure correct geospatial format
        coordinates: [long, lat],
        city,
        country,
      },
      client: client._id,
      date,
      time,
      breed,
      price,
      expectedCompletionTime,
      van: van_id,
    });
    await booking.save();

    // Step 3: Find or create the schedule
    let schedule = await Schedule.findOne({ van: van_id, date });
    if(schedule?.bookings.length >= 3){
            return res.status(404).send({Message: "Schedule full, try another date", Success: false})
    }
    if (!schedule) {
      schedule = new Schedule({
        van: van_id,
        date,
        bookings: [booking._id],
      });
    } else {
      
      schedule.bookings.push(booking._id);
    }

    await schedule.save();

    return res.status(201).json({ Message: "Appointment booked successfully", Success: true });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      message: "Server Error occurred while creating booking",
      error: error.message,
      success: false,
    });
  }
});

module.exports = router;
