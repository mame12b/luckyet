require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { globalRateLimit } = require("./middleware/rateLimit");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const drawRoutes = require("./routes/drawRoutes");

const app = express();

// Trust proxy (needed for rate-limit + correct IPs behind Render/Vercel/etc.)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS — allow both player and admin clients
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// NoSQL injection protection
app.use(mongoSanitize());

// Request logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Global rate limit
app.use("/api", globalRateLimit);

// Health
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "luckyet-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/draws", drawRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Start
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✓ LuckyET API on http://localhost:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

start();