const UserModel = require("../models/user.model");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createUser = async (userData) => {
  const user = new UserModel({
    ...userData,
    email: normalizeEmail(userData.email),
  });
  return await user.save();
};

const findUserByEmail = async (email) => {
  // Case-insensitive match also supports older records saved with mixed-case emails.
  // passwordHash and googleId are select:false — explicitly selected so the service
  // layer can authenticate and toPublicUserDTO can derive authProviders correctly.
  return await UserModel.findOne({
    email: { $regex: `^${escapeRegex(normalizeEmail(email))}$`, $options: "i" },
  }).select("+passwordHash +googleId");
};

const findUserById = async (id) => {
  // Select passwordHash and googleId so toPublicUserDTO can derive authProviders correctly.
  return await UserModel.findById(id).select("+passwordHash +googleId");
};

const findUserByGoogleId = async (googleId) => {
  return await UserModel.findOne({ googleId }).select("+passwordHash +googleId");
};

const saveUser = async (user) => {
  return await user.save();
};

module.exports = {
  normalizeEmail,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  saveUser,
};
