const express = require("express");
const router = express.Router();
const customerService = require("../service/customer.service");
const { authenticateToken } = require("../utilities");

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: true, message: "All fields are required" });
    }

    const result = await customerService.registerCustomer(fullName, email, password, role);

    if (result.error) {
      return res.status(result.message === "User already exists" ? 400 : 500).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Controller - Register error:", error);
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: true, message: "Email and password are required" });
    }

    const result = await customerService.loginCustomer(email, password);

    if (result.error) {
      return res.status(result.message === "User not found" || result.message === "Invalid credentials" ? 400 : 500).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Controller - Login error:", error);
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Get user endpoint
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const result = await customerService.getCustomer(user._id);

    if (result.error) {
      return res.status(401).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Controller - Get user error:", error);
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

module.exports = router;
