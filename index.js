const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const creater1 = require("./routes/create/createBooking")
const creater2 = require("./routes/create/createVan")
const bookroute = require("./routes/routing/book")
require("dotenv").config()

const app = express()

app.use(express.json())
app.use(cors())
app.use(express.urlencoded({extended: true}))
app.use("/", creater1)
app.use("/", creater2)
app.use("/", bookroute)

const port = process.env.PORT || 3500;

app.get("/", (req,res)=> {
    res.send("Routing Software ©️")
})
mongoose.connect(process.env.MONGO_URI)
.then(()=> {
    app.listen(port, ()=> console.log(`http://localhost:${port}`))
})
.catch((e)=> console.error("Error connecting to database: ", e))

module.exports = app;

