const Cart = require("../models/cart.model");
const { CART_STATUS } = require("../models/cart.model");

const ACTIVE_STATUSES = [CART_STATUS.IN_PURCHASE, CART_STATUS.PAYMENT];

const findActiveCartByUser = async (userId, statuses = ACTIVE_STATUSES) => {
  return await Cart.findOne({
    userId,
    status: { $in: Array.isArray(statuses) ? statuses : [statuses] },
  }).sort({ createdAt: -1 });
};

const findLatestActiveCart = async (statuses = [CART_STATUS.IN_PURCHASE]) => {
  return await Cart.findOne({
    status: { $in: Array.isArray(statuses) ? statuses : [statuses] },
  }).sort({ updatedAt: -1 });
};

const findCartBySessionId = async (sessionId) => {
  return await Cart.findOne({ sessionId });
};

const createCart = async (cartData) => {
  return await Cart.create(cartData);
};

const saveCart = async (cart) => {
  return await cart.save();
};

module.exports = {
  findActiveCartByUser,
  findLatestActiveCart,
  findCartBySessionId,
  createCart,
  saveCart,
};
