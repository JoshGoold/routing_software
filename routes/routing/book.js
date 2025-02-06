const express = require("express")
const findSlots = require("../../utils/routing/findSlots")

const router = express.Router()

router.get("/book", async (req, res)=> {
    const { long, lat } = req.query;
    try {
        const { available, possible } = await findSlots(long, lat);
        
        // If no available slots are found, return early with a 404 response
        if (available.length === 0) {
            return res.status(404).send({ Message: "No available slots - location is too far", Success: false });
        }

        // If there are available or possible slots, send a success response
        console.log(available);
        console.log(possible);

        return res.send({
            Message: "We've found some possible booking times",
            Available: available,
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
