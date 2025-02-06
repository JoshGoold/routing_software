const express = require("express")
const Van = require("../../models/VanSchema")

const router = express.Router()


router.post("/create-van", async (req,res)=> {
    const {name, phone, email, number} = req.body;
    try {
        const van = new Van({number,driver: {name, phone, email}})
        await van.save()
        res.send({Message: "Van Created", Success: true})
    } catch (error) {
        console.error("Error creating van: ", error)
        res.status(500).send({Message: "Server Error occured while creating van", error: error.message, Success: false})
    }
})

module.exports = router;