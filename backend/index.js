const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const mongoose = require("mongoose");
let uri = process.env.MONGODB_URI;
if (!uri) {
    try {
        uri = require("./config.json").connectionString;
    } catch (err) {
        console.warn("⚠️ MONGODB_URI not found in env and config.json missing.");
    }
}

if (uri) {
    mongoose
        .connect(uri)
        .then(() => console.log(" Connected to MongoDB successfully!"))
        .catch((err) => console.error(" MongoDB connection error:", err.message));
} else {
    console.error("❌ MongoDB connection URI is missing! Set MONGODB_URI in environment variables.");
}

const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const { initSocket } = require("./socket");

const { authenticateToken, authorizeRoles, normalizeRole, ROLES } = require("./utilities");
const userRepo = require("./repository/user.repo");
const userController = require("./controllers/user.controller");
const inventoryController = require("./controllers/inventory.controller");
const productController = require("./controllers/product.controller");
const cartController = require("./controllers/cart.controller");
const storeController = require("./controllers/store.controller");
const paymentController = require("./controllers/payment.controller");
const gateController = require("./controllers/gate.controller");
const shoppingListController = require("./controllers/shoppingList.controller");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const asyncHandler = require("./middleware/asyncHandler");

// Behind Render's proxy the forwarded protocol/host describe the public URL,
// which is what the gate QR code must point at.
app.set("trust proxy", 1);

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.json({ data: "hello", service: "BaskIt Smart Shopping Cart Backend", status: "running" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Customer routes
app.use("/customer", userController);

// Shared product catalogue lookup (available to signed-in users)
app.use("/products", authenticateToken, productController);

// Supermarket lookup and QR scan (available to signed-in users)
app.use("/store", authenticateToken, storeController);

// Shopping cart sessions (Customer only)
app.use("/cart", authenticateToken, authorizeRoles(ROLES.CUSTOMER), cartController);

// Stripe-hosted checkout (Customer only)
app.use("/payment", authenticateToken, authorizeRoles(ROLES.CUSTOMER), paymentController);

// Exit gate passes. Public: the QR code is opened by the exit scanner, which
// has no shopper session. Codes are random, single-use tokens.
app.use("/gate", gateController);

// Inventory routes (Shopkeeper only)
app.use("/inventory", authenticateToken, authorizeRoles(ROLES.SHOPKEEPER), inventoryController);

// Shopping list & Google Notes integration (signed-in customers)
app.use("/shopping-list", authenticateToken, shoppingListController);

// Legacy endpoint: get-user
app.get(
    "/get-user",
    authenticateToken,
    asyncHandler(async (req, res) => {
        const user = req.user;
        const isUser = await userRepo.findUserById(user._id);

        if (!isUser) {
            return res.sendStatus(401);
        }

        return res.json({
            user: {
                fullName: isUser.fullName,
                email: isUser.email,
                role: normalizeRole(isUser.role),
                _id: isUser._id,
                createdAt: isUser.createdAt,
                createdOn: isUser.createdAt,
            },
            message: "",
        });
    })
);

// Cart product management (delegated to cart controller & service)
app.post("/add-product", authenticateToken, cartController.addProduct);
app.get("/get-all-products", authenticateToken, cartController.getAllProducts);
app.delete("/remove-product/:productName", authenticateToken, cartController.removeProduct);

// 404 Route Not Found Middleware (catches any unmatched paths)
app.use(notFoundHandler);

// Global Error Handler Middleware (standardized JSON error responses)
app.use(errorHandler);

// Global process-level safety catches
process.on("unhandledRejection", (reason, promise) => {
    console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("🚨 Uncaught Exception thrown:", error);
});

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
initSocket(server);

if (require.main === module) {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
module.exports.server = server;
