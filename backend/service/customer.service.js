const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const customerRepo = require("../repository/customer.repo");

const registerCustomer = async (fullName, email, password, role = "customer") => {
  try {
    // Check if user already exists
    const existingCustomer = await customerRepo.findCustomerByEmail(email);
    if (existingCustomer) {
      return { error: true, message: "User already exists" };
    }

    // Hash password with 10 salt rounds
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new customer
    const newCustomer = await customerRepo.createCustomer({
      fullName,
      email,
      passwordHash: hashedPassword,
      role: role || "customer",
    });

    const secret = process.env.ACCESS_TOKEN_SECRET || "baskit_secret_jwt_key_2025";
    const accessToken = jwt.sign(
      { _id: newCustomer._id, email: newCustomer.email, role: newCustomer.role },
      secret,
      { expiresIn: "10h" }
    );

    return {
      error: false,
      message: "Registration successful",
      user: {
        _id: newCustomer._id,
        fullName: newCustomer.fullName,
        email: newCustomer.email,
        role: newCustomer.role,
        createdAt: newCustomer.createdAt,
      },
      accessToken,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: true, message: "Internal Server Error" };
  }
};

const loginCustomer = async (email, password) => {
  try {
    // Find customer by email
    const customer = await customerRepo.findCustomerByEmail(email);
    if (!customer) {
      return { error: true, message: "User not found" };
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, customer.passwordHash);
    if (!isPasswordValid) {
      return { error: true, message: "Invalid credentials" };
    }

    const secret = process.env.ACCESS_TOKEN_SECRET || "baskit_secret_jwt_key_2025";
    const accessToken = jwt.sign(
      { _id: customer._id, email: customer.email, role: customer.role },
      secret,
      { expiresIn: "10h" }
    );

    return {
      error: false,
      message: "Login successful",
      user: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        role: customer.role,
        createdAt: customer.createdAt,
      },
      accessToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: true, message: "Internal Server Error" };
  }
};

const getCustomer = async (id) => {
  try {
    const customer = await customerRepo.findCustomerById(id);
    if (!customer) {
      return { error: true, message: "User not found" };
    }
    return {
      error: false,
      user: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        role: customer.role,
        createdAt: customer.createdAt,
      },
    };
  } catch (error) {
    console.error("Get customer error:", error);
    return { error: true, message: "Internal Server Error" };
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomer,
};
