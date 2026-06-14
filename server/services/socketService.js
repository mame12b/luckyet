const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    path: "/socket.io/",
    transports: ["websocket"],       // ⚡️ Force WebSockets first (Protects Express HTTP routing thread)
    perMessageDeflate: false,        // 🔴 CRITICAL: Disables frame compression. Saves huge amounts of CPU under load.
    pingInterval: 15000,             // Keeps mobile connections alive smoothly
    pingTimeout: 30000,              // Adds a tolerance layer for moving mobile data cells
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
  });

  // 🛡 ADAPTIVE AUTHENTICATION MIDDLEWARE
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      
      // ✅ FIX: If there is no token, don't crash or reject! Treat them as a guest viewer.
      if (!token) {
        socket.userId = null;
        socket.role = "guest";
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch (err) {
      // If a token was provided but it expired, let them connect as a guest anyway so they can see the live draw
      socket.userId = null;
      socket.role = "guest";
      next();
    }
  });

  io.on("connection", (socket) => {
    // 🧠 MEMORY MANAGEMENT: Drop heavy raw connection headers from active memory loops
    socket.request = null;

    // Verbose logging only for admin tasks or dev environments to keep I/O channels clear
    if (process.env.NODE_ENV !== "production") {
      console.log(`[socket] CONNECT ${socket.id} | User: ${socket.userId} | Role: ${socket.role}`);
    }

    // Only join explicit user rooms if they are authenticated members
    if (socket.userId) {
      socket.join("user:" + socket.userId);
    }

    // Assign privileged admin channels safely
    if (socket.role === "admin" || socket.role === "super_admin") {
      socket.join("admins");
    }

    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[socket] DISCONNECT ${socket.id} | Reason: ${reason}`);
      }
    });
  });

  console.log("\u2713 Hardened Socket.io initialized successfully");
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  const room = "user:" + userId;
  io.to(room).emit(event, payload);
}

function emitToAdmins(event, payload) {
  if (!io) return;
  io.to("admins").emit(event, payload);
}

function broadcast(event, payload) {
  if (!io) return;
  // Use volatile if sending fast-updating visual states (like rapid rolling numbers)
  // io.volatile.emit(event, payload); 
  io.emit(event, payload);
}

module.exports = {
  init: init,
  emitToUser: emitToUser,
  emitToAdmins: emitToAdmins,
  broadcast: broadcast,
  get io() { return io; },
};