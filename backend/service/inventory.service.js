const path = require("path");
const fs = require("fs");
const inventoryRepo = require("../repository/inventory.repo");
const productRepo = require("../repository/product.repo");
const Store = require("../models/store.model");
const { initStoreGates } = require("./adafruit.service");
const { pulseExitGate } = require("./payment.service");
const AppError = require("../middleware/AppError");

const DEFAULT_STOCK = 50;
const DEFAULT_CART_CODES = inventoryRepo.DEFAULT_CART_CODES;

// Flatten one entry in inventory.products + its catalogue product for the UI.
const toInventoryItemDto = (entry, product, inventory) => {
  if (!product) return null;

  return {
    _id: product._id,
    inventoryId: inventory?._id,
    productId: product._id,
    barcode: product.productBarcode,
    productBarcode: product.productBarcode,
    product_name: product.productName,
    productName: product.productName,
    manufacturer: product.manufacturer,
    price: product.price,
    weight: product.weight,
    stockQuantity: entry.quantity,
    quantity: entry.quantity,
    createdAt: inventory?.createdAt,
    updatedAt: inventory?.updatedAt,
  };
};

const flattenInventory = (inventory) => {
  if (!inventory) return [];
  return inventory.products
    .map((entry) => toInventoryItemDto(entry, entry.productId, inventory))
    .filter(Boolean)
    .sort((a, b) => a.productName.localeCompare(b.productName));
};

// Seed the shared product catalogue + this shopkeeper's inventory from products.json.
const seedFromProductsJson = async (shopkeeperId) => {
  const possiblePaths = [
    path.join(__dirname, "../../../products.json"),
    path.join(__dirname, "../../products.json"),
    path.join(__dirname, "../products.json"),
    path.join(process.cwd(), "products.json"),
  ];

  let productsData = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      productsData = JSON.parse(fs.readFileSync(p, "utf-8"));
      break;
    }
  }

  if (!productsData) {
    return { inserted: 0, catalogueSize: await productRepo.countProducts() };
  }

  const inventory = await inventoryRepo.getOrCreateStore(shopkeeperId);
  const existingProductIds = new Set(
    inventory.products.map((entry) => String(entry.productId))
  );

  let inserted = 0;

  for (const [barcode, item] of Object.entries(productsData)) {
    const product = await productRepo.upsertProductByBarcode(barcode, {
      productName: item.product_name,
      productBarcode: barcode,
      manufacturer: item.manufacturer,
      price: Number(item.price),
      weight: Number(item.weight) || 0,
    });

    if (!existingProductIds.has(String(product._id))) {
      inventory.products.push({
        productId: product._id,
        quantity: Math.floor(Math.random() * 40) + 15,
      });
      existingProductIds.add(String(product._id));
      inserted += 1;
    }
  }

  if (inserted > 0) {
    await inventoryRepo.saveStore(inventory);
  }

  return { inserted, catalogueSize: await productRepo.countProducts() };
};

const getInventory = async (shopkeeperId) => {
  let inventory = await inventoryRepo.findPopulatedStore(shopkeeperId);

  // First visit: populate the catalogue and this store's stock.
  if (!inventory) {
    await seedFromProductsJson(shopkeeperId);
    inventory = await inventoryRepo.findPopulatedStore(shopkeeperId);
  }

  if (inventory) {
    let changed = false;

    if (!inventory.carts || inventory.carts.length === 0) {
      inventory.carts = DEFAULT_CART_CODES.map((cartCode) => ({ cartCode }));
      changed = true;
    }

    if (!inventory.storeCode) {
      inventory.storeCode = Store.generateStoreCode();
      changed = true;
    }

    if (!inventory.storeName) {
      inventory.storeName = "BaskIt Supermarket";
      changed = true;
    }

    if (changed) await inventoryRepo.saveStore(inventory);
  }

  if (inventory?.numberOfGates) {
    initStoreGates({
      storeName: inventory.storeName || inventory.name || "Supermarket",
      numberOfGates: inventory.numberOfGates,
    }).catch((err) => {
      console.warn("⚠️ Adafruit IO gate provisioning notice:", err.message);
    });
  }

  const items = flattenInventory(inventory);

  return {
    inventoryId: inventory?._id,
    store: {
      storeCode: inventory?.storeCode ?? null,
      storeName: inventory?.storeName ?? null,
      numberOfGates: inventory?.numberOfGates ?? 1,
    },
    items,
    count: items.length,
    carts: inventory?.carts ?? [],
  };
};

const getStats = async (shopkeeperId) => {
  const inventory = await inventoryRepo.findPopulatedStore(shopkeeperId);
  const items = flattenInventory(inventory);

  const totalProducts = items.length;
  const totalStock = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);
  const lowStockCount = items.filter((item) => (item.quantity || 0) < 10).length;

  return {
    totalProducts,
    totalStock,
    totalValue: Math.round(totalValue),
    lowStockCount,
  };
};

const getTransactions = async (shopkeeperId) => {
  const store = await inventoryRepo.findStoreByShopkeeper(shopkeeperId);
  const filter = {
    storeCode: store?.storeCode,
    storeName: store?.name,
  };

  const transactions = await inventoryRepo.findStoreTransactions(filter, 100);
  const totalRevenue = transactions.reduce(
    (sum, t) => sum + (Number(t.totalAmount) || 0),
    0
  );

  return {
    count: transactions.length,
    totalRevenue: Math.round(totalRevenue),
    transactions: transactions.map((t) => ({
      id: t._id,
      sessionId: t.sessionId,
      cartCode: t.cartCode || "CART",
      customer: {
        fullName: t.userId?.fullName || "Shopper",
        email: t.userId?.email || "Shopper",
      },
      items: t.items || [],
      itemsCount: (t.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0),
      totalAmount: Number(t.totalAmount) || 0,
      totalWeight: Number(t.totalWeight) || 0,
      paymentMethod: t.paymentMethod || "Stripe Checkout",
      paymentStatus: t.paymentStatus || "PAID",
      gateCode: t.gateCode,
      gateStatus: t.gateStatus || "Locked",
      gateUnlockedAt: t.gateUnlockedAt,
      completedAt: t.completedAt || t.createdAt,
    })),
  };
};

const addProductToInventory = async (shopkeeperId, payload) => {
  const barcode = payload.productBarcode ?? payload.barcode;
  const productName = payload.productName ?? payload.product_name;
  const manufacturer = payload.manufacturer ?? payload.Manufacturer;
  const price = payload.price ?? payload.Price;
  const quantity = payload.quantity ?? payload.stockQuantity;
  const weight = payload.weight;

  if (!barcode || !productName || !manufacturer || price === undefined || price === "") {
    throw new AppError("Barcode, product name, manufacturer and price are required", 400);
  }

  if (Number.isNaN(Number(price)) || Number(price) < 0) {
    throw new AppError("Price must be a valid non-negative number", 400);
  }

  if (quantity !== undefined && (Number.isNaN(Number(quantity)) || Number(quantity) < 0)) {
    throw new AppError("Quantity must be a valid non-negative number", 400);
  }

  const trimmedBarcode = String(barcode).trim();

  let product = await productRepo.findProductByBarcode(trimmedBarcode);
  if (!product) {
    product = await productRepo.createProduct({
      productName: String(productName).trim(),
      productBarcode: trimmedBarcode,
      manufacturer: String(manufacturer).trim(),
      price: Number(price),
      weight: Number(weight) || 0,
    });
  }

  const inventory = await inventoryRepo.getOrCreateStore(shopkeeperId);
  const alreadyStocked = inventory.products.some(
    (entry) => String(entry.productId) === String(product._id)
  );

  if (alreadyStocked) {
    throw new AppError("This product is already in your inventory. Update its stock quantity instead.", 409);
  }

  inventory.products.push({
    productId: product._id,
    quantity: quantity !== undefined ? Number(quantity) : DEFAULT_STOCK,
  });
  await inventoryRepo.saveStore(inventory);

  return toInventoryItemDto(
    inventory.products[inventory.products.length - 1],
    product,
    inventory
  );
};

const updateInventoryProduct = async (shopkeeperId, productId, payload) => {
  const inventory = await inventoryRepo.findStoreByShopkeeper(shopkeeperId);
  if (!inventory) {
    throw new AppError("Inventory not found", 404);
  }

  const entry = inventory.products.find(
    (item) => String(item.productId) === String(productId)
  );

  if (!entry) {
    throw new AppError("Product not found in your inventory", 404);
  }

  const product = await productRepo.findProductById(entry.productId);
  if (!product) {
    throw new AppError("Linked product not found", 404);
  }

  const barcode = payload.productBarcode ?? payload.barcode;
  const productName = payload.productName ?? payload.product_name;
  const manufacturer = payload.manufacturer ?? payload.Manufacturer;
  const price = payload.price ?? payload.Price;
  const quantity = payload.quantity ?? payload.stockQuantity;
  const weight = payload.weight;

  if (barcode !== undefined && String(barcode).trim() !== product.productBarcode) {
    const trimmedBarcode = String(barcode).trim();
    const duplicate = await productRepo.findDuplicateBarcode(trimmedBarcode, product._id);
    if (duplicate) {
      throw new AppError("Another product already uses this barcode", 409);
    }
    product.productBarcode = trimmedBarcode;
  }

  if (productName !== undefined && String(productName).trim()) product.productName = String(productName).trim();
  if (manufacturer !== undefined && String(manufacturer).trim()) product.manufacturer = String(manufacturer).trim();
  if (price !== undefined && price !== "") product.price = Number(price);
  if (weight !== undefined && weight !== "") product.weight = Number(weight);

  if (quantity !== undefined && quantity !== "") {
    const parsedQuantity = Number(quantity);
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      throw new AppError("Quantity must be a valid non-negative number", 400);
    }
    entry.quantity = parsedQuantity;
  }

  await productRepo.saveProduct(product);
  await inventoryRepo.saveStore(inventory);

  return toInventoryItemDto(entry, product, inventory);
};

const removeProductFromInventory = async (shopkeeperId, productId) => {
  const inventory = await inventoryRepo.findStoreByShopkeeper(shopkeeperId);
  if (!inventory) {
    throw new AppError("Inventory not found", 404);
  }

  const before = inventory.products.length;
  inventory.products = inventory.products.filter(
    (entry) => String(entry.productId) !== String(productId)
  );

  if (inventory.products.length === before) {
    throw new AppError("Product not found in your inventory", 404);
  }

  await inventoryRepo.saveStore(inventory);
  return { message: "Product removed from your inventory" };
};

const addCartToStore = async (shopkeeperId, rawCartCode) => {
  if (!rawCartCode || !String(rawCartCode).trim()) {
    throw new AppError("Cart code is required", 400);
  }
  const code = String(rawCartCode).trim().toUpperCase();
  const inventory = await inventoryRepo.getOrCreateStore(shopkeeperId);

  if (inventory.carts.some((c) => c.cartCode.toUpperCase() === code)) {
    throw new AppError(`Cart ${code} already exists in your store`, 409);
  }

  inventory.carts.push({ cartCode: code, status: "Free" });
  await inventoryRepo.saveStore(inventory);
  return inventory.carts;
};

const resetCartStatus = async (shopkeeperId, rawCartCode) => {
  const code = String(rawCartCode).trim().toUpperCase();
  const inventory = await inventoryRepo.getOrCreateStore(shopkeeperId);
  const cart = inventory.carts.find((c) => c.cartCode.toUpperCase() === code);

  if (!cart) {
    throw new AppError(`Cart ${code} not found`, 404);
  }

  const sessionId = cart.sessionId || cart.currentSessionId;
  if (sessionId) {
    const activeCart = await inventoryRepo.findCartBySessionId(sessionId);
    if (activeCart && Array.isArray(activeCart.items) && activeCart.items.length > 0) {
      for (const item of activeCart.items) {
        const stockEntry = inventory.products.find(
          (p) => String(p.productId) === String(item.productId) || (item.barcode && p.barcode === item.barcode)
        );
        if (stockEntry) {
          stockEntry.quantity = (stockEntry.quantity || 0) + (item.quantity || 1);
        }
      }
      activeCart.status = "Abandoned";
      activeCart.items = [];
      await inventoryRepo.saveCart(activeCart);
    }
  }

  cart.status = "Free";
  cart.sessionId = null;
  cart.userId = null;
  cart.currentSessionId = null;
  cart.currentUser = null;
  await inventoryRepo.saveStore(inventory);

  return inventory.carts;
};

const pulseGate = async (gateNumber = 1) => {
  return await pulseExitGate("(shopkeeper manual test)", gateNumber);
};

const syncGates = async (shopkeeperId) => {
  const inventory = await inventoryRepo.findStoreByShopkeeper(shopkeeperId);
  const storeName = inventory?.storeName || inventory?.name || "Supermarket";
  const numberOfGates = inventory?.numberOfGates || 1;
  const syncResult = await initStoreGates({ storeName, numberOfGates });
  return {
    success: syncResult.success,
    storeName,
    numberOfGates,
    details: syncResult,
  };
};

module.exports = {
  getInventory,
  getStats,
  getTransactions,
  addProductToInventory,
  updateInventoryProduct,
  removeProductFromInventory,
  seedFromProductsJson,
  addCartToStore,
  resetCartStatus,
  pulseGate,
  syncGates,
};
