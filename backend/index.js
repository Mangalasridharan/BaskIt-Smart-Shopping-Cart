const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const axios = require("axios");
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

const User = require("./models/customer.model");
const Product = require("./models/product.model");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");
const customerController = require("./controllers/customer.controller");
const inventoryController = require("./controllers/inventory.controller");

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.json({ data: "hello", service: "BaskIt Smart Shopping Cart Backend", status: "running" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Customer routes
app.use("/customer", customerController);

// Inventory routes (Shopkeeper / Admin)
app.use("/inventory", inventoryController);

//get user (legacy endpoint)
app.get("/get-user", authenticateToken, async (req, res) => {
    const user = req.user;
    const isUser = await User.findOne({ _id: user._id });

    if (!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: {
            fullName: isUser.fullName,
            email: isUser.email,
            role: isUser.role,
            _id: isUser._id,
            createdAt: isUser.createdAt,
            createdOn: isUser.createdAt,
        },
        message: "",
    });
});

// Add Product 
// Add Product 
app.post("/add-product", authenticateToken, async (req, res) => {
    const { product_name, Manufacturer, Price, Quantity, weight } = req.body;
    const user = req.user;

    console.log("Received Data:", { product_name, Manufacturer, Price, Quantity, weight }); // Debugging

    if (!product_name || !Manufacturer || !Price || !Quantity || !weight) {
        return res.status(400).json({ error: true, message: "All fields are required" });
    }

    try {
        const numericPrice = Number(Price);
        const numericQuantity = Number(Quantity);
        const numericWeight = Number(weight);

        if (isNaN(numericPrice) || isNaN(numericQuantity) || isNaN(numericWeight)) {
            return res.status(400).json({ error: true, message: "Invalid Price, Quantity, or Weight" });
        }

        const existingProduct = await Product.findOne({
            product_name: product_name.trim(),
            userId: user._id,
        });

        if (existingProduct) {
            existingProduct.Quantity += numericQuantity;
            existingProduct.weight += numericWeight;
            await existingProduct.save();
            console.log("Updated Product:", existingProduct); // Debugging
            return res.json({
                error: false,
                product: existingProduct,
                message: "Product quantity updated successfully",
            });
        }

        const product = new Product({
            product_name: product_name.trim(),
            Manufacturer,
            Price: numericPrice,
            Quantity: numericQuantity,
            weight: numericWeight,
            userId: user._id,
        });

        await product.save();
        console.log("New Product Saved:", product); // Debugging

        return res.json({
            error: false,
            product,
            message: "Product added successfully",
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});


//get all products
app.get("/get-all-products/",authenticateToken, async (req,res) => {
    const  user  = req.user;

    try {
        const products = await Product.find({ userId:user._id}).sort({ isPinned: -1 });
    

    return res.json({
        error:false,
        products,
        message:"All Products retreived successfully",
    });
    }
    catch (error)
    {
        return res.status(500).json({
            error:true,
            message:"Internal Server Error",
        });
    }

});

//remove product
app.delete("/remove-product/:productId", authenticateToken, async (req, res) => {
    const productId = req.params.productId;
    const user = req.user; // Get authenticated user

    try {
        const product = await Product.findOne({ _id: productId, userId: user._id });

        if (!product) {
            return res.status(404).json({ error: true, message: "Product not found" });
        }

        if (product.Quantity > 1) {
            const unitWeight = product.weight / product.Quantity; // Calculate per-unit weight
            product.Quantity = 1; // ✅ Set quantity to 1
            product.weight = unitWeight; // ✅ Set total weight to one unit
            await product.save();
            return res.json({
                error: false,
                message: "Product quantity set to 1",
                remainingQuantity: product.Quantity,
            });
        } else {
            await product.deleteOne(); // ✅ Remove product if quantity is already 1
            return res.json({
                error: false,
                message: "Product removed completely",
            });
        }
    } catch (error) {
        console.error("Error removing product:", error);
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});

// Add this route at the end of your index.js (before app.listen)
app.post("/update-adafruit", authenticateToken, async (req, res) => {
    const AIO_USERNAME = "Mangal"; // Replace with your Adafruit username
    const AIO_KEY = ""; // Replace with your actual AIO Key
    const FEED_NAME = "payment"; // Replace with your feed name

    const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${FEED_NAME}/data`;

    try {
        const response = await axios.post(
            url,
            { value: "ON" }, // Send '1' to turn ON the switch
            {
                headers: {
                    "X-AIO-Key": AIO_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ Adafruit IO updated successfully:", response.data);
        return res.json({ error: false, message: "Adafruit IO updated successfully" });
    } catch (error) {
        console.error("❌ Error updating Adafruit IO:", error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: true,
            message: "Failed to update Adafruit IO",
            details: error.response?.data || error.message,
        });
    }
});

app.post("/set-rescan", async (req, res) => {
    const AIO_USERNAME = "Mangal";
    const AIO_KEY = "aio_qgeN84rmbCwfvrColRvTpjSfjgyb";
    const RESCAN_FEED = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/rescan/data`;

    try {
        // Just trigger rescan mode without sending product ID
        await axios.post(RESCAN_FEED,
            { value: "ON" },
            { headers: { "X-AIO-Key": AIO_KEY } }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error("Adafruit IO Error:", error);
        res.status(500).json({ success: false });
    }
});

// Process Payment & Unlock Exit Gate
app.post("/process-payment", authenticateToken, async (req, res) => {
    const user = req.user;
    const { amount, paymentMethod, cardLast4 } = req.body;

    try {
        const transactionId = "BASKIT-TXN-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);
        
        // Signal Adafruit IO to open exit gate
        const AIO_USERNAME = process.env.AIO_USERNAME || "Mangal";
        const AIO_KEY = process.env.AIO_KEY || "aio_qgeN84rmbCwfvrColRvTpjSfjgyb";
        const FEED_NAME = "payment";
        const url = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${FEED_NAME}/data`;

        let gateTriggered = false;
        try {
            await axios.post(
                url,
                { value: "ON" },
                {
                    headers: {
                        "X-AIO-Key": AIO_KEY,
                        "Content-Type": "application/json",
                    },
                    timeout: 4000,
                }
            );
            gateTriggered = true;
            console.log("✅ Gate opened via Adafruit IO for transaction:", transactionId);
        } catch (gateErr) {
            console.warn("⚠️ Adafruit Gate trigger warning:", gateErr.message);
        }

        // Clear customer's live cart in database
        await Product.deleteMany({ userId: user._id });

        return res.json({
            error: false,
            message: "Payment processed successfully! Exit gate unlocked.",
            receipt: {
                transactionId,
                amount: Number(amount) || 0,
                paymentMethod: paymentMethod || "Stripe Card",
                cardLast4: cardLast4 || "4242",
                status: "PAID",
                gateStatus: gateTriggered ? "GATE_UNLOCKED" : "GATE_SIGNAL_SENT",
                paidAt: new Date().toISOString(),
                customerEmail: user.email,
            },
        });
    } catch (error) {
        console.error("Payment processing error:", error);
        return res.status(500).json({
            error: true,
            message: "Payment processing failed. Please try again.",
        });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
