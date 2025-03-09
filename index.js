const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const creater1 = require("./routes/create/createBooking")
const creater2 = require("./routes/create/createVan")
const api = require("./api/index")
const bookroute = require("./routes/routing/book")
const get1 = require("./routes/get/getSchedules")
const get2 = require("./routes/get/getVans")
const get3 = require("./routes/routing/new_book")

const createMonthSchedule = require("./utils/database/createSchedules")
require("dotenv").config()

const app = express()

app.use(express.json())
// CORS configuration
const corsOptions = {
 origin: (origin, callback) => {
 const allowedOrigins = ["https://routing-front-end.vercel.app", "http://localhost:3000"];
 console.log("Request Origin:", origin); // Debug
 if (!origin || allowedOrigins.includes(origin)) {
 callback(null, true);
 } else {
 callback(new Error("Not allowed by CORS"));
 }
 },
 methods: ["GET", "POST", "OPTIONS"], // Include OPTIONS explicitly
 allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Handle OPTIONS preflight manually if needed
app.options("*", cors(corsOptions));
app.use(express.urlencoded({extended: true}))
app.use("/", creater1)
app.use("/", creater2)
app.use("/", bookroute)
app.use("/", get1)
app.use("/", get2)
app.use("/", api)
app.use("/", get3)

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