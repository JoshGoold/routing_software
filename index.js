const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const creater1 = require("./routes/create/createBooking");
const creater2 = require("./routes/create/createVan");
const api = require("./api/index");
const bookroute = require("./routes/routing/book");
const get1 = require("./routes/get/getSchedules");
const get2 = require("./routes/get/getVans");
const get3 = require("./routes/routing/new_book");
const createMonthSchedule = require("./utils/database/createSchedules");
require("dotenv").config();

const app = express();

// MongoDB Connection Setup
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    console.log("Reusing existing MongoDB connection");
    return cachedConnection;
  }

  try {
    console.log("Establishing new MongoDB connection");
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 10000, // Reduce to 10s for faster failure
      socketTimeoutMS: 30000,  // 30s timeout for socket operations
      serverSelectionTimeoutMS: 10000, // Faster server selection
    });
    cachedConnection = connection;
    console.log("MongoDB connected successfully");
    return connection;
  } catch (e) {
    console.error("MongoDB connection failed:", e);
    throw e;
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["https://routing-front-end.vercel.app", "http://localhost:3000"];
    console.log("Request Origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Routes
app.use("/", creater1);
app.use("/", creater2);
app.use("/", bookroute);
app.use("/", get1);
app.use("/", get2);
app.use("/", api);
app.use("/", get3);

// Root Route
app.get("/", (req, res) => {
  res.send("Routing Software ©️");
});

// Start Server with DB Connection
const port = process.env.PORT || 3700;

async function startServer() {
  try {
    await connectToDatabase();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await createMonthSchedule(year, month);
    app.listen(port, () => console.log(`http://localhost:${port}`));
  } catch (e) {
    console.error("Failed to start server:", e);
  }
}

startServer();

module.exports = app;
​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​

