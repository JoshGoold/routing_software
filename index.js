const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const creater1 = require("./routes/create/createBooking")
const creater2 = require("./routes/create/createVan")
const api = require("./api/index")
const bookroute = require("./routes/routing/book")
const get1 = require("./routes/get/getSchedules")
const get2 = require("./routes/get/getVans")

const createMonthSchedule = require("./utils/database/createSchedules")
require("dotenv").config()

const app = express()

app.use(express.json())
app.use(cors({origin: ["https://routing-front-end.vercel.app","https://routing-front-end.vercel.app/", "http://localhost:3000" ]}))
app.use(express.urlencoded({extended: true}))
app.use("/", creater1)
app.use("/", creater2)
app.use("/", bookroute)
app.use("/", get1)
app.use("/", get2)
app.use("/", api)

const port = process.env.PORT || 3700;

app.get("/", (req,res)=> {
    res.send("Routing Software ©️")
})
mongoose.connect(process.env.MONGO_URI)
.then(async()=> {
    app.listen(port, ()=> console.log(`http://localhost:${port}`))
      // Get current year and month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-based index
    await createMonthSchedule(year,month)
})
.catch((e)=> console.error("Error connecting to database: ", e))

module.exports = app;

