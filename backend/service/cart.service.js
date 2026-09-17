const { randomUUID } = require("node:crypto");
const cartRepo = require("../repository/cart.repo");
const productRepo = require("../repository/product.repo");
const storeRepo = require("../repository/store.repo");
const { CART_STATUS } = require("../models/cart.model");
const { ROLES, normalizeRole } = require("../utilities");
const { toCartDto, toCartProductItemDto } = require("../dto/cart.dto");
const { notifyStockReduction, notifyInventoryUpdated, notifyCartStatusChange } = require("../socket");
const AppError = require("../middleware/AppError");

const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();

/**
 * Resolves the appropriate active cart for a user.
 * Shopkeepers on test-scans target the latest active shopper session; customers target their own.
 */
const resolveActiveCart = async (user, statuses) => {
  if (normalizeRole(user.role) === ROLES.SHOPKEEPER) {
    return await cartRepo.findLatestActiveCart(statuses);
  }
  return await cartRepo.findActiveCartByUser(user._id, statuses);
};

/**
 * Start a new shopping cart session by scanning cart QR / code in a store.
 */
const startCartSession = async (user, payload = {}) => {
  const cartCode = normalizeCode(payload.cartCode ?? payload.code);
  const storeName = String(payload.storeName ?? payload.name ?? "").trim();
  const storeId = payload.storeId ?? payload._id;
  const storeCode = normalizeCode(payload.storeCode ?? payload.store);

  if (!storeId && !storeName && !storeCode) {
    throw new AppError("Scan the supermarket QR code before scanning a cart.", 400);
  }

  if (!cartCode) {
    throw new AppError("Cart code is required", 400);
  }

  // Shopper can hold only one active cart at a time.
  const existing = await cartRepo.findActiveCartByUser(user._id);
  if (existing) {
    return {
      isExisting: true,
      cart: toCartDto(existing),
      message: "You already have an active cart session",
    };
  }

  const store = await storeRepo.findStoreByLookup({ storeId, storeName, storeCode });
  if (!store) {
    throw new AppError("Supermarket was not found.", 404);
  }

  const physicalCart = store.carts.find((entry) => entry.cartCode === cartCode);
  if (!physicalCart) {
    const belongsToAnotherStore = await storeRepo.existsStoreWithCartCode(cartCode);
    throw new AppError(
      belongsToAnotherStore
        ? `Cart ${cartCode} belongs to a different store.`
        : `Cart ${cartCode} is not registered in ${store.name}.`,
      404
    );
  }

  if (physicalCart.status !== CART_STATUS.FREE) {
    throw new AppError(
      `Cart ${cartCode} is currently ${physicalCart.status} and cannot be grabbed.`,
      409
    );
  }

  const sessionId = randomUUID();
  const cart = await cartRepo.createCart({
    sessionId,
    userId: user._id,
    storeCode: store.storeCode,
    cartCode,
    items: [],
    totalPrice: 0,
    totalWeight: 0,
    status: CART_STATUS.IN_PURCHASE,
  });

  physicalCart.status = CART_STATUS.IN_PURCHASE;
  physicalCart.sessionId = cart.sessionId;
  physicalCart.userId = user._id;
  await storeRepo.saveStore(store);

  try {
    notifyCartStatusChange({
      storeCode: store.storeCode,
      cartCode: physicalCart.cartCode,
      status: physicalCart.status,
      sessionId: physicalCart.sessionId,
      carts: store.carts,
    });
  } catch (err) {
    console.warn("⚠️ Failed to notify cart status change:", err.message);
  }

  return {
    isExisting: false,
    cartCode,
    store: {
      storeId: store._id,
      storeName: store.name,
    },
    cart: toCartDto(cart),
    message: `Cart ${cartCode} grabbed successfully at ${store.name}`,
  };
};

/**
 * Retrieve active cart session for a user.
 */
const getActiveCart = async (user) => {
  const cart = await resolveActiveCart(user, [CART_STATUS.IN_PURCHASE, CART_STATUS.PAYMENT]);
  return {
    cart: toCartDto(cart),
  };
};

/**
 * Initiate payment state on an active cart.
 */
const initiatePayment = async (user) => {
  const cart = await resolveActiveCart(user, [CART_STATUS.IN_PURCHASE, CART_STATUS.PAYMENT]);
  if (!cart) {
    throw new AppError("No active cart session", 404);
  }

  cart.status = CART_STATUS.PAYMENT;
  await cartRepo.saveCart(cart);

  const store = await storeRepo.findStoreBySessionOrCode({
    storeCode: cart.storeCode,
    sessionId: cart.sessionId,
  });

  if (store) {
    const physicalCart = store.carts.find((entry) => entry.sessionId === cart.sessionId);
    if (physicalCart) {
      physicalCart.status = CART_STATUS.PAYMENT;
      await storeRepo.saveStore(store);
    }
  }

  return {
    message: "Payment initiated",
    cart: toCartDto(cart),
  };
};

/**
 * Scan / Add a product into the user's active cart session.
 */
const addProductToCart = async (user, payload = {}) => {
  const barcode = payload.productBarcode ?? payload.barcode;
  const productName = String(payload.productName ?? payload.product_name ?? "").trim();
  const manufacturer = String(payload.manufacturer ?? payload.Manufacturer ?? "").trim();
  const price = Number(payload.price ?? payload.Price);
  const quantity = Number(payload.quantity ?? payload.Quantity ?? 1);
  const weight = Number(payload.weight) || 0;

  if (!barcode && !productName) {
    throw new AppError("A product barcode or product name is required", 400);
  }

  if (Number.isNaN(quantity) || quantity < 1) {
    throw new AppError("Quantity must be at least 1", 400);
  }

  const cart = await resolveActiveCart(user, [CART_STATUS.IN_PURCHASE]);
  if (!cart) {
    throw new AppError("No active cart session. Scan a cart QR code before adding products.", 409);
  }

  const barcodeValue = barcode ? String(barcode).trim() : null;
  let product = barcodeValue
    ? await productRepo.findProductByBarcode(barcodeValue)
    : await productRepo.findProductByNameAndManufacturer(productName, manufacturer);

  if (!product) {
    if (normalizeRole(user.role) === ROLES.SHOPKEEPER && productName && manufacturer && !Number.isNaN(price)) {
      product = await productRepo.createProduct({
        productName,
        productBarcode: barcodeValue || `SKU-${Date.now()}-${user._id}`,
        manufacturer,
        price,
        weight,
      });
    } else {
      throw new AppError(
        "Product not found in store catalog. Please scan a valid product.",
        404
      );
    }
  }

  // Resolve store for this cart session to check and deduct stock
  let store = await storeRepo.findStoreBySessionOrCode({
    storeCode: cart.storeCode,
    sessionId: cart.sessionId,
  });

  // Check store inventory for availability and reduce shelf stock immediately
  if (store && Array.isArray(store.products)) {
    const stockEntry = store.products.find(
      (entry) =>
        String(entry.productId) === String(product._id) ||
        (entry.barcode && entry.barcode === product.productBarcode)
    );

    if (!stockEntry) {
      throw new AppError(
        `"${product.productName}" is not available in ${store.name || "this store"}.`,
        404
      );
    }

    const availableStock = stockEntry.quantity || 0;
    if (availableStock <= 0) {
      throw new AppError(
        `"${product.productName}" is currently out of stock!`,
        409
      );
    }

    if (availableStock < quantity) {
      throw new AppError(
        `Insufficient stock for "${product.productName}". Only ${availableStock} unit(s) remaining.`,
        409
      );
    }

    stockEntry.quantity = Math.max(0, availableStock - quantity);
    await storeRepo.saveStore(store);

    try {
      notifyStockReduction({
        storeCode: store.storeCode,
        cartCode: cart.cartCode,
        items: [
          {
            productId: product._id,
            barcode: product.productBarcode,
            productName: product.productName,
            quantityDeducted: quantity,
            newQuantity: stockEntry.quantity,
          },
        ],
      });
    } catch (socketErr) {
      console.warn("⚠️ Failed to emit stock reduction socket event:", socketErr.message);
    }
  }

  const unitWeight = Number(product.weight) || weight || 0;
  const existingItem = cart.items.find(
    (item) => item.productName.toLowerCase() === product.productName.toLowerCase()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = product.price;
    existingItem.weight = unitWeight * existingItem.quantity;
    existingItem.productId = existingItem.productId || product._id;
    existingItem.barcode = existingItem.barcode || product.productBarcode;
  } else {
    cart.items.push({
      productId: product._id,
      barcode: product.productBarcode,
      productName: product.productName,
      price: product.price,
      quantity,
      weight: unitWeight * quantity,
    });
  }

  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cart.totalWeight = cart.items.reduce((sum, item) => sum + item.weight, 0);
  cart.status = CART_STATUS.IN_PURCHASE;

  await cartRepo.saveCart(cart);

  const cartItem = cart.items.find(
    (item) => item.productName.toLowerCase() === product.productName.toLowerCase()
  );

  return {
    product: toCartProductItemDto(cartItem, product.manufacturer, product.productBarcode, product._id),
    cart: toCartDto(cart),
  };
};

/**
 * Retrieve all products in the current active cart session.
 */
const getAllCartProducts = async (user) => {
  const cart = await resolveActiveCart(user, [CART_STATUS.IN_PURCHASE, CART_STATUS.PAYMENT]);

  if (!cart) {
    return {
      products: [],
      cart: null,
      message: "No active cart session",
    };
  }

  const names = cart.items.map((item) => item.productName);
  const catalogue = await productRepo.findProductsByNames(names);
  const manufacturerByName = new Map(
    catalogue.map((p) => [p.productName.toLowerCase(), p.manufacturer])
  );

  const products = cart.items.map((item) =>
    toCartProductItemDto(
      item,
      manufacturerByName.get(item.productName.toLowerCase()) || "Unknown",
      item.barcode,
      item.productId
    )
  );

  return {
    products,
    cart: toCartDto(cart),
    message: "All Products retreived successfully",
  };
};

/**
 * Remove / reduce a product from the current active cart session.
 */
const removeProductFromCart = async (user, rawProductName, rawBarcode) => {
  const productName = decodeURIComponent(String(rawProductName || "")).trim();
  const barcode = String(rawBarcode || "").trim();

  if (!barcode) {
    throw new AppError("Scan or enter the product barcode to remove it.", 400);
  }

  const cart = await resolveActiveCart(user, [CART_STATUS.IN_PURCHASE, CART_STATUS.PAYMENT]);
  if (!cart) {
    throw new AppError("No active cart session", 404);
  }

  const item = cart.items.find(
    (entry) => entry.productName.toLowerCase() === productName.toLowerCase()
  );

  if (!item) {
    throw new AppError("Product not found in cart", 404);
  }

  const scannedProduct = await productRepo.findProductByBarcode(barcode);
  if (!scannedProduct) {
    throw new AppError("No product matches that barcode. Nothing was removed.", 404);
  }

  if (scannedProduct.productName.toLowerCase() !== item.productName.toLowerCase()) {
    throw new AppError(
      `That barcode belongs to ${scannedProduct.productName}, not ${item.productName}. Nothing was removed.`,
      409
    );
  }

  let message = "";
  let remainingQuantity = 0;
  let quantityToRestore = 0;

  if (item.quantity > 1) {
    quantityToRestore = 1;
    item.quantity -= 1;
    const unitWeight = item.weight / (item.quantity + 1);
    item.weight = unitWeight * item.quantity;
    message = `Reduced quantity of ${item.productName} to ${item.quantity}`;
    remainingQuantity = item.quantity;
  } else {
    quantityToRestore = item.quantity;
    cart.items = cart.items.filter(
      (entry) => entry.productName.toLowerCase() !== productName.toLowerCase()
    );
    message = `Removed ${productName} completely from cart`;
    remainingQuantity = 0;
  }

  cart.totalPrice = cart.items.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  cart.totalWeight = cart.items.reduce((sum, entry) => sum + entry.weight, 0);

  await cartRepo.saveCart(cart);

  if (quantityToRestore > 0) {
    let store = await storeRepo.findStoreBySessionOrCode({
      storeCode: cart.storeCode,
      sessionId: cart.sessionId,
    });

    if (store && Array.isArray(store.products)) {
      const stockEntry = store.products.find(
        (entry) =>
          String(entry.productId) === String(scannedProduct._id) ||
          (entry.barcode && entry.barcode === scannedProduct.productBarcode)
      );

      if (stockEntry) {
        stockEntry.quantity = (stockEntry.quantity || 0) + quantityToRestore;
        await storeRepo.saveStore(store);

        try {
          notifyInventoryUpdated({
            storeCode: store.storeCode,
            message: `Restored ${quantityToRestore}x ${scannedProduct.productName} to inventory`,
            type: "restock",
          });
        } catch (socketErr) {
          console.warn("⚠️ Failed to emit inventory restock event:", socketErr.message);
        }
      }
    }
  }

  return {
    message,
    remainingQuantity,
    cart: toCartDto(cart),
  };
};

module.exports = {
  startCartSession,
  getActiveCart,
  initiatePayment,
  addProductToCart,
  getAllCartProducts,
  removeProductFromCart,
};
