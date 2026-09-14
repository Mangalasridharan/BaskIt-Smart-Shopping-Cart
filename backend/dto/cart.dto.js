/**
 * Transforms a Cart document into a client-safe DTO.
 */
const toCartDto = (cart) => {
  if (!cart) return null;

  return {
    _id: cart._id,
    sessionId: cart.sessionId,
    userId: cart.userId,
    storeCode: cart.storeCode,
    cartCode: cart.cartCode,
    items: (cart.items || []).map((item) => ({
      productId: item.productId,
      barcode: item.barcode,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
    })),
    totalPrice: cart.totalPrice,
    totalWeight: cart.totalWeight,
    status: cart.status,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

/**
 * Formats a cart product item with manufacturer metadata for the UI.
 */
const toCartProductItemDto = (cartItem, manufacturer = "Unknown", barcode = null, productId = null) => {
  if (!cartItem) return null;

  return {
    _id: cartItem.productName,
    productId: cartItem.productId || productId || null,
    barcode: cartItem.barcode || barcode || null,
    product_name: cartItem.productName,
    Manufacturer: manufacturer,
    Price: cartItem.price,
    Quantity: cartItem.quantity,
    weight: cartItem.weight,
  };
};

module.exports = {
  toCartDto,
  toCartProductItemDto,
};
