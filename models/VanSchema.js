const mongoose = require("mongoose");

const VanSchema = new mongoose.Schema({
    number: {type: Number, required: true, unique: true},
    driver: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true }
    }
});

module.exports = mongoose.model("Van", VanSchema);
