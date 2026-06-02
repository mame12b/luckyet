const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Initialize Socket.io on the existing HTTP server.
 * Must be called from server.js with the http.Server instance.
 */
function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        process.env.ADMIN_URL,
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:5173",
        "http://localhost:5174",
      ].filter(Boolean),
      credentials: true,
    },
    // Path is the same as default but explicit for nginx mapping clarity
    path: "/socket.io/",
  });

  // Auth middleware — runs on connection handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("auth_required"));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error("invalid_token"));
    }
  });

  io.on("connection", (socket) => {
    // Per-user room — for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Admins also join the admins room for broadcast events
    if (socket.role === "admin" || socket.role === "super_admin") {
      socket.join("admins");
    }

    socket.on("disconnect", () => {
      // Clean disconnect — rooms auto-leave
    });
  });

  console.log("✓ Socket.io initialized");
  return io;
}

/**
 * Emit to a specific user. No-op if io isn't ready (during startup or tests).
 */
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

/**
 * Emit to all connected admins.
 */
function emitToAdmins(event, payload) {
  if (!io) return;
  io.to("admins").emit(event, payload);
}

/**
 * Broadcast to everyone connected (rarely used — currently for "draw starting").
 */
function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = {
  init,
  emitToUser,
  emitToAdmins,
  broadcast,
  get io() { return io; },
};
