const jwt = require("jsonwebtoken");
const AppError = require("./AppError");
const { ROLES, VALID_ROLES, normalizeRole } = require("../constants/roles");

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "baskit_secret_jwt_key_2025";
const JWT_EXPIRES_IN = "10h";

const signAccessToken = (user) =>
  jwt.sign(
    { _id: user._id, email: user.email, role: normalizeRole(user.role) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Authentication required. Please log in.", 401));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new AppError("Session expired. Please log in again.", 401));
    }
    req.user = { ...user, role: normalizeRole(user.role) };
    next();
  });
}

function authorizeRoles(...roles) {
  const allowed = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required. Please log in.", 401));
    }

    if (!allowed.includes(normalizeRole(req.user.role))) {
      return next(
        new AppError("Access denied. You do not have permission to perform this action.", 403)
      );
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  signAccessToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ROLES,
  VALID_ROLES,
  normalizeRole,
};
