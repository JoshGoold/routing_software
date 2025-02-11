const express = require("express")
const Schedule = require("../../models/ScheduleSchema")

const router = express.Router();

router.get("/get-schedules", async (req,res)=> {
    try {
        const schedules = await Schedule.find({}).populate("bookings")
        if(!schedules || schedules.length === 0) return res.status(404).send({Message: "No schedules found. Please create some.", Success: false}) 
        return res.send({Message: "Schedules located.", Success: true, Schedules: schedules})
    } catch (error) {
        console.error("Error occured while searching for schedules ->", error)
        res.status(500).send({Message: "Error occured while searching for schedules", Success: false, Error: error.message})
    }
})


module.exports = router;
