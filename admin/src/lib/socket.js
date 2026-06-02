import { io } from "socket.io-client";
import { useAuthStore } from "../store/auth";

const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN || window.location.origin;

let socket = null;

export function connectSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (socket?.connected) socket.disconnect();

  socket = io(SOCKET_ORIGIN, {
    path: "/socket.io/",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => console.log("[admin socket] connected"));
  socket.on("disconnect", (r) => console.log("[admin socket] disconnected:", r));
  socket.on("connect_error", (err) => console.warn("[admin socket] error:", err.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function getSocket() { return socket; }
