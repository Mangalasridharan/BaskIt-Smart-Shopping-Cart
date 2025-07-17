require("dotenv").config();
const axios=require("axios");
const config = require("./config.json");
const mongoose = require("mongoose");

mongoose.connect(config.connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB successfully!");
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});

const User = require("./models/user.model");
const Product = require("./models/product.model");

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.json({ data: "hello" });
});


//Backend Ready!!

// Create Account
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: true, message: "All fields are required" });
    }

    const isUser = await User.findOne({ email });

    if (isUser) {
        return res.json({ error: true, message: "User already exists" });
    }

    console.log("Saving User:", { fullName, email, password }); // Debugging log

    const user = new User({ fullName, email, password });

    await user.save();

    const accessToken = jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
    });

    return res.json({
        error: false,
        user: { _id: user._id, fullName: user.fullName, email: user.email },
        accessToken,
        message: "Registration Successful",
    });
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: true, message: "Email and password are required" });
    }

    const userInfo = await User.findOne({ email }).lean(); // Use lean() to return a plain object

    if (!userInfo) {
        return res.status(400).json({ error: true, message: "User not found" });
    }

    console.log("Stored Password:", userInfo.password); // Debugging log
    console.log("Entered Password:", password);

    if (!userInfo.password) {
        return res.status(500).json({ error: true, message: "Password field is missing from database" });
    }

    if (userInfo.password !== password) {
        return res.status(400).json({ error: true, message: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ _id: userInfo._id, email: userInfo.email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
    });

    return res.json({
        error: false,
        message: "Login successful",
        user: { _id: userInfo._id, fullName: userInfo.fullName, email: userInfo.email },
        accessToken,
    });
});

//get user
app.get("/get-user",authenticateToken, async (req,res)=> {
    const user = req.user;
    const isUser = await User.findOne({_id:user._id});

    if(!isUser){
        return res.sendStatus(401);
    }

    return res.json({
        user:{fullName: isUser.fullName, email:isUser.email,"_id":isUser._id,createdOn: isUser.createdOn,},
        message:"",

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
            product.Quantity -= 1; // ✅ Reduce quantity by 1
            product.weight -= (product.weight / (product.Quantity + 1)); // ✅ Reduce weight correctly
            await product.save();
            return res.json({
                error: false,
                message: "One product quantity removed successfully",
                remainingQuantity: product.Quantity,
            });
        } else {
            await product.deleteOne(); // ✅ Remove product if quantity reaches zero
            return res.json({
                error: false,
                message: "Product removed completely as quantity reached zero",
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

app.listen(8000, () => console.log("Server running on port 8000"));

module.exports = app;
