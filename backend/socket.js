const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { normalizeRole, ROLES } = require("./utilities");
const Store = require("./models/store.model");

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "baskit_secret_jwt_key_2025";

let io = null;

/**
 * Initialize Socket.IO with HTTP Server
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware: decode JWT if passed in auth or headers
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

      if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (!err && decoded) {
            socket.user = { ...decoded, role: normalizeRole(decoded.role) };
          }
        });
      }
      return next();
    } catch {
      return next();
    }
  });

  io.on("connection", async (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // If authenticated as a shopkeeper, auto-join their store room and personal room
    if (socket.user && socket.user.role === ROLES.SHOPKEEPER) {
      socket.join(`shopkeeper:${socket.user._id}`);
      try {
        const store = await Store.findOne({
          $or: [{ ownerId: socket.user._id }, { shopkeeperId: socket.user._id }],
        });
        if (store?.storeCode) {
          const room = `store:${store.storeCode.toUpperCase()}`;
          socket.join(room);
          console.log(`🔌 Shopkeeper ${socket.user.email} joined ${room}`);
        }
      } catch (err) {
        console.warn("⚠️ Failed to resolve store for shopkeeper socket:", err.message);
      }
    }

    // Client can also explicitly join a store room by storeCode
    socket.on("join-store", ({ storeCode }) => {
      if (storeCode) {
        const room = `store:${String(storeCode).trim().toUpperCase()}`;
        socket.join(room);
        console.log(`🔌 Socket ${socket.id} joined room ${room}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`⚡ Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Emit an event to a store room.
 * Also emits to all connected sockets if storeCode is not specified.
 */
const emitToStore = (storeCode, event, data) => {
  if (!io) return;

  if (storeCode) {
    const room = `store:${String(storeCode).trim().toUpperCase()}`;
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
};

/**
 * Broadcast when customer purchases deduct stock from inventory
 */
const notifyStockReduction = ({ storeCode, cartCode, items }) => {
  emitToStore(storeCode, "inventory:stock-reduced", {
    storeCode,
    cartCode,
    items, // array of { productId, barcode, productName, quantityDeducted, newQuantity }
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast when a physical cart's state changes (Free, In Purchase, Payment)
 */
const notifyCartStatusChange = ({ storeCode, cartCode, status, sessionId, carts }) => {
  emitToStore(storeCode, "cart:status-changed", {
    storeCode,
    cartCode,
    status,
    sessionId,
    carts,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast when general inventory or catalog entries are modified
 */
const notifyInventoryUpdated = ({ storeCode, message, type = "update" }) => {
  emitToStore(storeCode, "inventory:updated", {
    storeCode,
    message,
    type,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Broadcast when a new checkout transaction is recorded
 */
const notifyNewTransaction = ({ storeCode, transaction }) => {
  emitToStore(storeCode, "transaction:new", {
    storeCode,
    transaction,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  initSocket,
  getIO,
  emitToStore,
  notifyStockReduction,
  notifyCartStatusChange,
  notifyInventoryUpdated,
  notifyNewTransaction,
};
