require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const cors = require("cors");
const companyRoutes = require("./routes/company");
const authRoutes = require("./routes/auth");
const satelliteRoutes = require("./routes/satellites");

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

console.log("API Endpoints:");
console.log("/api/companies -> Company Routes");
console.log("/api/auth -> Auth Routes");
console.log("/api/satellites -> Satellite Routes");

mongoose
  .connect(`${process.env.DB_URI}/${process.env.DB_NAME}`)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
  console.log("Health check endpoint accessed.");
});

app.use("/api/companies", companyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/satellites", satelliteRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/health`);
});