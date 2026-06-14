import { io } from "socket.io-client";
import { useAuthStore } from "../store/auth";

const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN || window.location.origin;

let socket = null;
const subscribers = new Map();

function attachAllSubscribers(s) {
  if (!s) return;
  subscribers.forEach((handlers, event) => {
    handlers.forEach((handler) => {
      s.off(event, handler); // Deduplicate to prevent double-firing
      s.on(event, handler);
    });
  });
}

export function connectSocket() {
  // If a socket is already active and healthy, don't kill it unnecessarily
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;

  // OPTIMIZATION: Prioritize native WebSockets directly to protect Contabo CPU
  socket = io(SOCKET_ORIGIN, {
    path: "/socket.io/",
    auth: token ? { token } : {}, // ✅ ALLOWS ANONYMOUS VIEWERS TO CONNECT
    transports: ["websocket"],    // ✅ FORCE WEBSOCKETS (No expensive HTTP fallback loops)
    reconnection: true,
    reconnectionAttempts: 10,     // Higher allowance for fluctuating mobile data
    reconnectionDelay: 1000,
    reconnectionDelayMax: 4000,   // Faster reconnection cycle for live updates
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected successfully");
    attachAllSubscribers(socket);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
    // If the server forced a disconnect due to scaling/restarts, automatically try reconnecting
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connection/auth error:", err.message);
    
    // Fallback: If strict websocket handshake fails due to proxy/firewall constraints, try polling
    if (socket.io.opts.transports[0] === "websocket") {
      console.log("[socket] falling back to adaptive transport routing...");
      socket.io.opts.transports = ["websocket", "polling"];
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
  // Lazy initialization: if code asks for socket before it's ready, spin it up
  if (!socket) return connectSocket();
  return socket; 
}

export function onSocketEvent(event, handler) {
  if (!subscribers.has(event)) subscribers.set(event, new Set());
  subscribers.get(event).add(handler);
  
  if (socket) {
    socket.off(event, handler);
    socket.on(event, handler);
  }
  
  return () => {
    subscribers.get(event)?.delete(handler);
    if (socket) socket.off(event, handler);
  };
}