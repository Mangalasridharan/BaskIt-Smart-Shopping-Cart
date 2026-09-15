const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const userRepo = require("../repository/user.repo");
const Store = require("../models/store.model");
const { ROLES, normalizeRole, signAccessToken } = require("../utilities");
const { toPublicUserDTO } = require("../dto/user.dto");
const { initStoreGates } = require("./adafruit.service");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const ALLOWED_REGISTRATION_ROLES = [ROLES.CUSTOMER, ROLES.SHOPKEEPER];

const fail = (message, statusCode = 400) => ({ error: true, message, statusCode });

const validateRegistration = ({ fullName, email, password, role }) => {
  if (!fullName || !String(fullName).trim()) {
    return "Full name is required";
  }

  if (String(fullName).trim().length < 2) {
    return "Full name must be at least 2 characters long";
  }

  if (!email || !String(email).trim()) {
    return "Email is required";
  }

  if (!EMAIL_REGEX.test(userRepo.normalizeEmail(email))) {
    return "Please enter a valid email address";
  }

  if (!password) {
    return "Password is required";
  }

  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }

  if (role !== undefined && role !== null && role !== "" && !ALLOWED_REGISTRATION_ROLES.includes(role)) {
    return "Invalid role. Choose either customer or shopkeeper";
  }

  return null;
};

/**
 * Creates Store and initializes Store Inventory with physical carts for shopkeeper.
 */
const initShopkeeperStore = async (shopkeeperId, storeData = {}) => {
  const storeName = String(storeData.name || storeData.storeName || "My Supermarket").trim();
  const numberOfCarts = Math.max(1, parseInt(storeData.numberOfCarts, 10) || 5);
  const numberOfGates = Math.max(1, parseInt(storeData.numberOfGates, 10) || 1);

  // Build cart items (e.g. CART-01, CART-02 ...)
  const carts = Array.from({ length: numberOfCarts }, (_, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    return { cartCode: `CART-${num}` };
  });

  // Create or update Store document
  const store = await Store.findOneAndUpdate(
    { ownerId: shopkeeperId },
    {
      ownerId: shopkeeperId,
      name: storeName,
      storeName,
      numberOfGates,
      carts,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Initialize Adafruit IO gate feeds and dashboard buttons in the background
  initStoreGates({ storeName, numberOfGates }).catch((err) => {
    console.warn("⚠️ Non-blocking Adafruit IO gate provisioning notice:", err.message);
  });

  return store;
};

const registerUser = async (fullName, email, password, role = ROLES.CUSTOMER, storeData = null) => {
  try {
    const validationError = validateRegistration({ fullName, email, password, role });
    if (validationError) {
      return fail(validationError, 400);
    }

    const assignedRole = normalizeRole(role || ROLES.CUSTOMER);

    if (assignedRole === ROLES.SHOPKEEPER) {
      const storeName = storeData?.name || storeData?.storeName;
      if (!storeName || !String(storeName).trim()) {
        return fail("Supermarket name is required for shopkeeper registration", 400);
      }
      if (storeData.numberOfCarts !== undefined && Number(storeData.numberOfCarts) < 1) {
        return fail("Number of carts must be at least 1", 400);
      }
      if (storeData.numberOfGates !== undefined && Number(storeData.numberOfGates) < 1) {
        return fail("Number of gates must be at least 1", 400);
      }
    }

    const normalizedEmail = userRepo.normalizeEmail(email);
    const existingUser = await userRepo.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const newUser = await userRepo.createUser({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
    });

    let store = null;
    if (assignedRole === ROLES.SHOPKEEPER) {
      store = await initShopkeeperStore(newUser._id, storeData);
    }

    const accessToken = signAccessToken(newUser);

    return {
      error: false,
      message: "Registration successful",
      user: toPublicUserDTO(newUser),
      store: store ? { name: store.name, storeCode: store.storeCode, numberOfCarts: store.numberOfCarts, numberOfGates: store.numberOfGates } : null,
      accessToken,
    };
  } catch (error) {
    // Handles a race where the same email is registered twice at once
    if (error.code === 11000) {
      return fail("An account with this email already exists", 409);
    }

    console.error("Registration error:", error);
    return fail("Internal Server Error", 500);
  }
};

const loginUser = async (email, password) => {
  try {
    if (!email || !String(email).trim() || !password) {
      return fail("Email and password are required", 400);
    }

    const normalizedEmail = userRepo.normalizeEmail(email);
    const user = await userRepo.findUserByEmail(normalizedEmail);

    // Use the same message for unknown email and wrong password
    // so the API does not reveal which accounts exist.
    if (!user || !user.passwordHash) {
      return fail("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isPasswordValid) {
      return fail("Invalid email or password", 401);
    }

    const accessToken = signAccessToken(user);

    return {
      error: false,
      message: "Login successful",
      user: toPublicUserDTO(user),
      accessToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    return fail("Internal Server Error", 500);
  }
};

const getUser = async (id) => {
  try {
    const user = await userRepo.findUserById(id);
    if (!user) {
      return fail("User not found", 404);
    }

    return {
      error: false,
      user: toPublicUserDTO(user),
    };
  } catch (error) {
    console.error("Get user error:", error);
    return fail("Internal Server Error", 500);
  }
};

const loginWithGoogle = async (idToken, selectedRole = ROLES.CUSTOMER, storeData = null) => {
  try {
    if (!idToken || !String(idToken).trim()) {
      return fail("Google ID token is required", 400);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID || undefined,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return fail("Invalid Google token payload", 400);
    }

    const googleId = payload.sub;
    const normalizedEmail = userRepo.normalizeEmail(payload.email);
    const fullName = payload.name || payload.email.split("@")[0];

    // 1. Try finding by googleId first
    let user = await userRepo.findUserByGoogleId(googleId);

    // 2. If not found by googleId, check by email (Account Linking)
    if (!user) {
      user = await userRepo.findUserByEmail(normalizedEmail);
      if (user) {
        // Link Google ID to existing email account
        user.googleId = googleId;
        if (!user.emailVerifiedAt) {
          user.emailVerifiedAt = new Date();
        }
        await userRepo.saveUser(user);
      }
    }

    // 3. If user doesn't exist, register new user via Google
    let store = null;
    if (!user) {
      const assignedRole = normalizeRole(
        ALLOWED_REGISTRATION_ROLES.includes(selectedRole) ? selectedRole : ROLES.CUSTOMER
      );

      user = await userRepo.createUser({
        fullName,
        email: normalizedEmail,
        googleId,
        role: assignedRole,
        emailVerifiedAt: new Date(),
      });

      if (assignedRole === ROLES.SHOPKEEPER) {
        store = await initShopkeeperStore(user._id, storeData);
      }
    }

    const accessToken = signAccessToken(user);

    return {
      error: false,
      message: "Google sign-in successful",
      user: toPublicUserDTO(user),
      store: store ? { name: store.name, storeCode: store.storeCode, numberOfCarts: store.numberOfCarts, numberOfGates: store.numberOfGates } : null,
      accessToken,
    };
  } catch (error) {
    console.error("Google login error:", error);
    return fail("Google authentication failed. Please try again.", 401);
  }
};

module.exports = {
  REGISTER_ROLES: ALLOWED_REGISTRATION_ROLES,
  MIN_PASSWORD_LENGTH,
  registerUser,
  loginUser,
  loginWithGoogle,
  getUser,
};
