const storeRepo = require("../repository/store.repo");
const AppError = require("../middleware/AppError");

/**
 * Searches for a supermarket by name (from manual entry or scanned QR).
 *
 * @param {string} storeName - Supermarket name
 * @returns {Promise<Document>} - The populated Store document
 * @throws {AppError} - If name is missing or store doesn't exist
 */
const findStoreByName = async (storeName) => {
  const cleanName = String(storeName ?? "").trim();

  if (!cleanName) {
    throw new AppError("Store name or QR code is required", 400);
  }

  const store = await storeRepo.findStoreByName(cleanName);

  if (!store) {
    throw new AppError("Invalid store name or QR code", 404);
  }

  return store;
};

module.exports = {
  findStoreByName,
};
