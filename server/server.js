// Only load .env in development. In production (Docker), env vars come from the orchestrator.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { globalRateLimit } = require("./middleware/rateLimit");
const socketService = require("./services/socketService");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const drawRoutes = require("./routes/drawRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const streamerRoutes = require("./routes/streamerRoutes");

const app = express();

app.set("trust proxy", 1);

// Security headers — relax crossOriginResourcePolicy so uploaded receipts
// can be embedded/displayed by the frontend on a different origin.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS — allow our two frontends + any Vercel preview deployments.
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  // Belt-and-suspenders fallbacks (Docker nginx ports + Vite dev ports)
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server / curl / health checks (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow Vercel preview URLs (e.g. luckyet-abc123.vercel.app)
      if (origin.includes("vercel.app")) return cb(null, true);
      return cb(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/api", globalRateLimit);

// Serve uploaded receipts. Filenames are unguessable hex + timestamp.
// TODO: gate /uploads behind admin auth in Phase 7 hardening.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health endpoint — used by Docker healthcheck
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "luckyet-api",
    version: "0.3.0",
    socket: !!socketService.io,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/streamers", streamerRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// === Boot ===
const PORT = process.env.PORT || 5000;

// Create the HTTP server FIRST, then attach Socket.io to it.
// Both Express and Socket.io share the same TCP listener.
const server = http.createServer(app);
socketService.init(server);

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`✓ LuckyET API on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("✗ Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful shutdown — closes sockets and HTTP server before exit.
const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    console.log("✓ HTTP server closed");
    process.exit(0);
  });
  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
