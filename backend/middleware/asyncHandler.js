/**
 * Higher-order wrapper for Express route handlers to eliminate try/catch boilerplate.
 * Automatically catches any rejected promise and forwards it to next(err).
 *
 * @param {Function} fn - async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
