const express = require("express");
const axios = require("axios")
const app = express.Router();

app.get("/get-travel-time", async (req, res) => {
    try {
        const { origin, destination } = req.query; // Pass lat,lng as query params
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.status === "OK") {
            const travelTime = data.rows[0].elements[0].duration.text; 
            const distance = data.rows[0].elements[0].distance.text; 
            return res.send({Success: true, travelTime, distance });
        } else {
            return res.status(400).send({ Message: "Invalid response from Google API", Success: false });
        }
    } catch (error) {
        console.error("Error fetching travel time:", error);
        return res.status(500).send({ Message: "Internal server error", Success: false });
    }
});

module.exports = app;
