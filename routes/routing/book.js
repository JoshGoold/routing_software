const express = require("express")
const findSlots = require("../../utils/routing/findSlots");
const getUpcomingSchedules = require("../../utils/routing/findAvailableSchedules");
const getGrokCheck = require("../../api/grokCheck")

const router = express.Router()

router.get("/book", async (req, res)=> {
    const { long, lat } = req.query;
    try {
        const { available, possible } = await findSlots(long, lat);
        
        // If no available slots are found, return early with a 404 response
        if (available.length === 0) {
            const emptySchdeules = await getUpcomingSchedules()

            if(emptySchdeules){
                console.log(emptySchdeules)
                return res.send({
                    Message: "We've found some possible booking times",
                    Available: emptySchdeules,
                    Success: true,
                })
            } else{
                return res.status(404).send({Message: "No available times, please try again another day", Success: false})
            }
        }

        // If there are available or possible slots, send a success response
        console.log(available);
        console.log(possible);
        //const confirmedAvailable = await getGrokCheck(long, lat, available);
        //let fillSchedules = [];
        //if (confirmedAvailable.available.length > 0) {
            //const baseDate = confirmedAvailable.available[0].date.split("T")[0]; // "2025-03-12"
            ///const startDate = new Date(baseDate);
            //startDate.setDate(startDate.getDate() + 2); // Move to next day, e.g., "2025-03-13"
            //fillSchedules = await getUpcomingSchedules();
        //}
        const fillSchedules = await getUpcomingSchedules();
        // Combine confirmedAvailable and fillSchedules
        const allAvailable = [...available, ...fillSchedules];

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
})

module.exports = router;
