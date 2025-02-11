const express = require("express")
const Van = require("../../models/VanSchema")

const router = express.Router();

router.get("/get-vans", async (req,res)=> {
    try {
        const vans = await Van.find({})
        if(!vans || vans.length === 0) return res.status(404).send({Message: "No vans found. Please create some.", Success: false}) 
        return res.send({Message: "Vans located.", Success: true, Vans: vans})
    } catch (error) {
        console.error("Error occured while searching for vans ->", error)
        res.status(500).send({Message: "Error occured while searching for vans", Success: false, Error: error.message})
    }
})


module.exports = router;
