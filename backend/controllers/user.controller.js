const express = require("express");
const router = express.Router();
const userService = require("../service/user.service");
const { authenticateToken } = require("../utilities");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../middleware/AppError");

const sendServiceResult = (res, result) => {
  if (result.error) {
    throw new AppError(result.message, result.statusCode || 400);
  }
  const { statusCode, ...body } = result;
  return res.status(statusCode || 200).json(body);
};

// Register endpoint
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role, store } = req.body;

    if (!fullName || !email || !password) {
      throw new AppError("All fields are required", 400);
    }

    const result = await userService.registerUser(fullName, email, password, role, store);
    return sendServiceResult(res, result);
  })
);

// Login endpoint
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const result = await userService.loginUser(email, password);
    return sendServiceResult(res, result);
  })
);

// Google OAuth Login / Register endpoint
router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const { idToken, role, store } = req.body;

    if (!idToken) {
      throw new AppError("Google idToken is required", 400);
    }

    const result = await userService.loginWithGoogle(idToken, role, store);
    return sendServiceResult(res, result);
  })
);

// Get current authenticated user session
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await userService.getUser(req.user._id);
    return sendServiceResult(res, result);
  })
);

module.exports = router;
