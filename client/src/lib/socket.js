import { io } from "socket.io-client";
import { useAuthStore } from "../store/auth";

// In dev/Docker, the player frontend is at localhost:8080 (nginx).
// We hit /socket.io on the SAME origin — nginx proxies it to backend.
// In raw npm-run-dev (no nginx), VITE_API_ORIGIN points directly to localhost:5000.
const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN || window.location.origin;

let socket = null;

/**
 * Connect (or reconnect) the socket with the current access token.
 * Call after login / on app load when token is available.
 */
export function connectSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  // Already connected? Disconnect first to swap the token.
  if (socket?.connected) socket.disconnect();

  socket = io(SOCKET_ORIGIN, {
    path: "/socket.io/",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error:", err.message);
    // If auth was rejected, token is bad — clear it
    if (err.message === "invalid_token" || err.message === "auth_required") {
      socket.disconnect();
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
