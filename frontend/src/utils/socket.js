import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

let socketInstance = null;

/**
 * Return singleton socket.io client instance
 */
export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem("token");
    socketInstance = io(BASE_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
};

/**
 * Connect to Socket.io and join store room if provided
 */
export const connectSocket = (storeCode) => {
  const socket = getSocket();
  const token = localStorage.getItem("token");
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    socket.connect();
  }
  if (storeCode) {
    socket.emit("join-store", { storeCode });
  }
  return socket;
};

/**
 * Cleanly disconnect socket
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
