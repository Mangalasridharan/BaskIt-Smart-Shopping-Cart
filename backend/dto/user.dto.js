const { normalizeRole } = require("../utilities");

/**
 * Converts a raw Mongoose user document into a safe public-facing object.
 *
 * - Strips sensitive fields: passwordHash, googleId, isActive, emailVerifiedAt, __v
 * - Derives `authProviders` from the presence of passwordHash / googleId
 *   instead of storing it as a redundant field in the DB.
 *
 * NOTE: To include `authProviders` accurately, the calling query must select
 * passwordHash and googleId explicitly:
 *   User.findById(id).select('+passwordHash +googleId')
 * For most endpoints (login, register) these fields are already on the document.
 * For getUser (profile fetch), the repo selects them when needed.
 */
const toPublicUserDTO = (user) => {
  const providers = [];
  if (user.passwordHash) providers.push("password");
  if (user.googleId)     providers.push("google");

  return {
    _id:           user._id,
    fullName:      user.fullName,
    email:         user.email,
    role:          normalizeRole(user.role),
    authProviders: providers,   // derived — not stored in DB
    createdAt:     user.createdAt,
  };
};

module.exports = { toPublicUserDTO };
