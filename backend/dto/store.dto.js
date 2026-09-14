const { CART_STATUS } = require("../models/cart.model");

/**
 * Transforms a raw Store document into a safe customer-facing DTO.
 *
 * Exposes only the public supermarket identity and cart availability,
 * hiding internal identifiers and private store codes from the user.
 */
const toPublicStoreDTO = (store) => {
  if (!store) return null;

  const carts = store.carts || [];
  const freeCartsCount = carts.filter((c) => c.status === CART_STATUS.FREE).length;

  return {
    _id: store._id,
    storeId: store._id,
    storeCode: store.storeCode,
    storeName: store.name,
    shopkeeperName: store.ownerId?.fullName || null,
    totalCarts: carts.length,
    freeCarts: freeCartsCount,
  };
};

module.exports = { toPublicStoreDTO };
