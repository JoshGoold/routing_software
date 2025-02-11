const mongoose = require("mongoose")

const BreedSchema = new mongoose.Schema({
    name: {type: String, required: true},
    services: {
        grooming: {type: Number},
        bathing: {type: Number},
        massage: {type: Number}
    }
})

module.exports = mongoose.model("Breed", BreedSchema)