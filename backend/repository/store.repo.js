const Store = require("../models/store.model");

const escapeRegex = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findStoreByName = async (storeName) => {
  const safeRegex = new RegExp(`^${escapeRegex(String(storeName).trim())}$`, "i");
  return await Store.findOne({ name: safeRegex }).populate("ownerId", "fullName email");
};

const findStoreByCode = async (storeCode) => {
  return await Store.findOne({ storeCode: String(storeCode).trim().toUpperCase() });
};

const findStoreById = async (id) => {
  return await Store.findById(id);
};

const findStoreByLookup = async ({ storeId, storeName, storeCode }) => {
  const lookup = [];
  if (storeId) lookup.push({ _id: storeId });
  if (storeName) lookup.push({ name: new RegExp(`^${escapeRegex(String(storeName).trim())}$`, "i") });
  if (storeCode) lookup.push({ storeCode: String(storeCode).trim().toUpperCase() });

  if (lookup.length === 0) return null;
  return await Store.findOne({ $or: lookup });
};

const findStoreByOwnerOrShopkeeper = async (shopkeeperId) => {
  return await Store.findOne({
    $or: [{ ownerId: shopkeeperId }, { shopkeeperId }],
  });
};

const findPopulatedStoreByOwner = async (shopkeeperId) => {
  return await Store.findOne({
    $or: [{ ownerId: shopkeeperId }, { shopkeeperId }],
  }).populate("products.productId");
};

const findStoreBySessionOrCode = async ({ storeCode, sessionId }) => {
  if (storeCode) {
    const store = await Store.findOne({ storeCode });
    if (store) return store;
  }
  if (sessionId) {
    return await Store.findOne({ "carts.sessionId": sessionId });
  }
  return null;
};

const existsStoreWithCartCode = async (cartCode) => {
  return await Store.exists({ "carts.cartCode": String(cartCode).trim().toUpperCase() });
};

const createStore = async (storeData) => {
  return await Store.create(storeData);
};

const saveStore = async (store) => {
  return await store.save();
};

module.exports = {
  findStoreByName,
  findStoreByCode,
  findStoreById,
  findStoreByLookup,
  findStoreByOwnerOrShopkeeper,
  findPopulatedStoreByOwner,
  findStoreBySessionOrCode,
  existsStoreWithCartCode,
  createStore,
  saveStore,
};
