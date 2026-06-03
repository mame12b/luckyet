import { io } from "socket.io-client";
import { useAuthStore } from "../store/auth";

const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN || window.location.origin;

let socket = null;

// Subscribers keep their event handlers in this map.
// When a new socket connects, we re-attach all handlers to it.
// This survives reconnects and the initial "socket isn't ready yet" race.
const subscribers = new Map();   // event -> Set of handlers

function attachAllSubscribers(s) {
  if (!s) return;
  subscribers.forEach((handlers, event) => {
    handlers.forEach((handler) => {
      s.off(event, handler);   // safety: remove if already attached
      s.on(event, handler);
    });
  });
}

export function connectSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  // Disconnect previous socket if any (e.g. switching users)
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
    // CRITICAL: re-attach all subscribers to the live socket
    attachAllSubscribers(socket);
  });
  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error:", err.message);
    if (err.message === "invalid_token" || err.message === "auth_required") {
      socket?.disconnect();
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

/**
 * Subscribe to a socket event with reconnect-safe semantics.
 * Returns an unsubscribe function.
 *
 * Usage:
 *   const off = onSocketEvent("payment.verified", (data) => { ... });
 *   // ...later
 *   off();
 */
export function onSocketEvent(event, handler) {
  if (!subscribers.has(event)) subscribers.set(event, new Set());
  subscribers.get(event).add(handler);

  // If a socket is already alive, attach immediately
  if (socket) {
    socket.on(event, handler);
  }

  // Return unsubscribe
  return () => {
    subscribers.get(event)?.delete(handler);
    if (socket) socket.off(event, handler);
  };
}
