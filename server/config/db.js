const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // 1. Production Performance Tuning Optimization
    // Prevents Mongoose from auto-building indexes on startup (saves massive CPU overhead).
    mongoose.set("autoIndex", false);

    // 2. Setup Robust Connection Events & Lifecycle Hooks
    mongoose.connection.on("connected", () => {
      console.log("✓ MongoDB status: Connected smoothly");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`✗ MongoDB runtime connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠ MongoDB connection dropped! Attempting automatic recovery...");
    });

    // 3. Establish the Connection with Safe Pooling Configurations
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Allows up to 50 simultaneous active DB operations. Perfect for your Contabo setup.
      maxPoolSize: 50, 
      // Minimum open idle connections to avoid cold-start lag during sudden spikes.
      minPoolSize: 10,
      // Give up after 10 seconds if Atlas/DB is totally down, rather than hanging the thread indefinitely.
      serverSelectionTimeoutMS: 10000, 
      // Close sockets if a single operation takes longer than 30 seconds.
      socketTimeoutMS: 30000,
      // Keeps the TCP handshake alive in the background.
     
    });

    console.log(`✓ MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (err) {
    console.error("✗ Fatal MongoDB connection failure during startup:", err.message);
    // Exit immediately so your Docker container orchestrator knows to restart the container
    process.exit(1);
  }
};

module.exports = connectDB;