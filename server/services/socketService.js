const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

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
    path: "/socket.io/",
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
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
    console.log("[socket] CONNECT socket=" + socket.id + " userId=" + socket.userId + " role=" + socket.role);
    socket.join("user:" + socket.userId);
    if (socket.role === "admin" || socket.role === "super_admin") {
      socket.join("admins");
    }
    socket.on("disconnect", (reason) => {
      console.log("[socket] DISCONNECT socket=" + socket.id + " userId=" + socket.userId + " reason=" + reason);
    });
  });

  console.log("\u2713 Socket.io initialized");
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io) {
    console.log("[socket] EMIT-SKIPPED io not ready event=" + event);
    return;
  }
  const room = "user:" + userId;
  const roomMap = io.sockets.adapter.rooms.get(room);
  const size = roomMap ? roomMap.size : 0;
  console.log("[socket] EMIT " + event + " -> " + room + " (listeners=" + size + ")");
  io.to(room).emit(event, payload);
}

function emitToAdmins(event, payload) {
  if (!io) return;
  const roomMap = io.sockets.adapter.rooms.get("admins");
  const size = roomMap ? roomMap.size : 0;
  console.log("[socket] EMIT " + event + " -> admins (listeners=" + size + ")");
  io.to("admins").emit(event, payload);
}

function broadcast(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = {
  init: init,
  emitToUser: emitToUser,
  emitToAdmins: emitToAdmins,
  broadcast: broadcast,
  get io() { return io; },
};
