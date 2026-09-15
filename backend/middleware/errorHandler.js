const AppError = require("./AppError");

/**
 * 404 Not Found Middleware
 * Intercepts any request that did not match an existing route.
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global Error Handler Middleware for Express.
 * Express identifies this as an error-handling middleware because of the 4 arguments (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details || null;

  // 1. Handle Malformed JSON payload from express.json()
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON payload provided in request body.";
  }

  // 2. Handle Mongoose Validation Errors (e.g. required field missing or schema validation failure)
  else if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    const validationErrors = Object.values(err.errors).map((e) => e.message);
    message = validationErrors.join(". ") || "Validation failed";
    details = validationErrors;
  }

  // 3. Handle Mongoose CastError (e.g. invalid MongoDB ObjectId format)
  else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for resource parameter "${err.path}": ${err.value}`;
  }

  // 4. Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const duplicatedFields = Object.keys(err.keyValue || {}).join(", ");
    message = duplicatedFields
      ? `A record with this ${duplicatedFields} already exists.`
      : "Duplicate record error.";
    details = err.keyValue;
  }

  // 5. Handle JWT Authentication / Expiration Errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token. Please log in again.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired. Please log in again.";
  }

  // 6. Handle Axios External API Errors (e.g., Stripe, Adafruit IO, Google Tasks)
  else if (err.isAxiosError) {
    statusCode = err.response?.status || 502;
    message =
      err.response?.data?.message ||
      err.response?.data?.error?.message ||
      err.response?.data?.error ||
      err.message ||
      "External service communication failure.";
    details = err.response?.data || null;
  }

  // Log server/internal errors for diagnostics
  if (statusCode >= 500) {
    console.error(`🚨 [Server Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.warn(`⚠️ [Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  // Standardized JSON response payload matching BaskIt API format
  const isDev = process.env.NODE_ENV === "development";
  const responsePayload = {
    error: true,
    message,
    statusCode,
    ...(details && { details }),
    ...(isDev && { stack: err.stack }),
  };

  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
