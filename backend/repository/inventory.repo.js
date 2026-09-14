const Store = require("../models/store.model");
const Transaction = require("../models/transaction.model");
const Cart = require("../models/cart.model");

const DEFAULT_CART_CODES = ["CART-01", "CART-02", "CART-03", "CART-04", "CART-05"];

const findStoreByShopkeeper = async (shopkeeperId) => {
  return await Store.findOne({
    $or: [{ ownerId: shopkeeperId }, { shopkeeperId }],
  });
};

const findPopulatedStore = async (shopkeeperId) => {
  return await Store.findOne({
    $or: [{ ownerId: shopkeeperId }, { shopkeeperId }],
  }).populate("products.productId");
};

const getOrCreateStore = async (shopkeeperId) => {
  let store = await findStoreByShopkeeper(shopkeeperId);
  if (!store) {
    store = await Store.create({
      ownerId: shopkeeperId,
      products: [],
      carts: DEFAULT_CART_CODES.map((cartCode) => ({ cartCode })),
    });
  }
  return store;
};

const saveStore = async (store) => {
  return await store.save();
};

const findStoreTransactions = async ({ storeCode, storeName }, limit = 100) => {
  const filter = {};
  if (storeCode || storeName) {
    const orConditions = [];
    if (storeCode) orConditions.push({ storeCode });
    if (storeName) orConditions.push({ storeName });
    filter.$or = orConditions;
  }

  return await Transaction.find(filter)
    .populate("userId", "fullName email")
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(limit);
};

const findCartBySessionId = async (sessionId) => {
  return await Cart.findOne({ sessionId });
};

const saveCart = async (cart) => {
  return await cart.save();
};

module.exports = {
  DEFAULT_CART_CODES,
  findStoreByShopkeeper,
  findPopulatedStore,
  getOrCreateStore,
  saveStore,
  findStoreTransactions,
  findCartBySessionId,
  saveCart,
};
