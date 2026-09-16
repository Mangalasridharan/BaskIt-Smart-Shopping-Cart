const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user.model");
const Store = require("../models/store.model");
const Product = require("../models/product.model");

const connectionString = process.env.MONGODB_URI;

if (!connectionString) {
  console.error("❌ MONGODB_URI not found in environment variables or backend/.env");
  process.exit(1);
}

const DEMO_SHOPKEEPER = {
  fullName: "Demo Shopkeeper",
  email: "shopkeeper@baskit.com",
  password: "shopkeeper@123",
  role: "shopkeeper",
};

const DEMO_CUSTOMER = {
  fullName: "Demo Shopper",
  email: "shopper@baskit.com",
  password: "shopper@123",
  role: "customer",
};

const LEGACY_CUSTOMER = {
  fullName: "Demo Shopper (Mangal)",
  email: "mangal@gmail.com",
  password: "mangal@123",
  role: "customer",
};

const STORE_CONFIG = {
  storeCode: "BASKIT-MART",
  storeName: "BaskIt Supermarket",
  numberOfGates: 5,
  carts: ["CART-01", "CART-02", "CART-03", "CART-04", "CART-05"],
};

async function seedDemo() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(connectionString);
    console.log(" Connected to MongoDB successfully.\n");

    // 1. Seed / Update Demo Shopkeeper
    console.log("--- 1. Setting up Demo Shopkeeper Account ---");
    let shopkeeper = await User.findOne({ email: DEMO_SHOPKEEPER.email });
    const shopkeeperPasswordHash = await bcrypt.hash(DEMO_SHOPKEEPER.password, 10);

    if (!shopkeeper) {
      shopkeeper = await User.create({
        fullName: DEMO_SHOPKEEPER.fullName,
        email: DEMO_SHOPKEEPER.email,
        passwordHash: shopkeeperPasswordHash,
        role: DEMO_SHOPKEEPER.role,
      });
      console.log(` Created Demo Shopkeeper: ${DEMO_SHOPKEEPER.email}`);
    } else {
      shopkeeper.role = DEMO_SHOPKEEPER.role;
      shopkeeper.passwordHash = shopkeeperPasswordHash;
      await shopkeeper.save();
      console.log(` Updated Demo Shopkeeper: ${DEMO_SHOPKEEPER.email}`);
    }

    // 2. Load Products Catalog from products.json
    console.log("\n--- 2. Loading Mock Stock Catalog ---");
    const possiblePaths = [
      path.join(__dirname, "../../products.json"),
      path.join(__dirname, "../products.json"),
      path.join(process.cwd(), "products.json"),
    ];

    let productsData = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        productsData = JSON.parse(fs.readFileSync(p, "utf-8"));
        console.log(` Loaded catalogue from ${p}`);
        break;
      }
    }

    if (!productsData) {
      throw new Error("Could not find products.json!");
    }

    const seededProducts = [];
    for (const [barcode, item] of Object.entries(productsData)) {
      const product = await Product.findOneAndUpdate(
        { productBarcode: barcode },
        {
          $set: {
            productName: item.product_name,
            productBarcode: barcode,
            manufacturer: item.manufacturer,
            price: Number(item.price),
            weight: Number(item.weight) || 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seededProducts.push(product);
    }
    console.log(` Upserted ${seededProducts.length} catalogue products.`);

    // 3. Configure Shopkeeper Store (5 Carts, 5 Gates, Stock Inventory)
    console.log("\n--- 3. Configuring Shopkeeper Store (5 Carts, 5 Gates) ---");
    let store = await Store.findOne({
      $or: [{ ownerId: shopkeeper._id }, { storeCode: STORE_CONFIG.storeCode }],
    });

    // Build the 5 physical carts in Free status
    const physicalCarts = STORE_CONFIG.carts.map((cartCode) => ({
      cartCode,
      status: "Free",
      sessionId: null,
      userId: null,
      currentSessionId: null,
      currentUser: null,
    }));

    // Build store stock entries from the catalogue (35 - 50 units each)
    const storeStock = seededProducts.map((p, idx) => ({
      productId: p._id,
      barcode: p.productBarcode,
      quantity: 35 + ((idx * 7) % 25), // varied realistic stock: 35 to 55 units
    }));

    if (!store) {
      store = await Store.create({
        ownerId: shopkeeper._id,
        shopkeeperId: shopkeeper._id,
        storeCode: STORE_CONFIG.storeCode,
        name: STORE_CONFIG.storeName,
        numberOfGates: STORE_CONFIG.numberOfGates,
        carts: physicalCarts,
        products: storeStock,
      });
      console.log(` Created Store "${store.name}" with 5 Carts and 5 Gates.`);
    } else {
      store.ownerId = shopkeeper._id;
      store.shopkeeperId = shopkeeper._id;
      store.name = STORE_CONFIG.storeName;
      store.storeCode = STORE_CONFIG.storeCode;
      store.numberOfGates = STORE_CONFIG.numberOfGates;
      store.carts = physicalCarts;
      store.products = storeStock;
      await store.save();
      console.log(` Updated Store "${store.name}" with 5 Carts, 5 Gates, and ${storeStock.length} stocked products.`);
    }

    // 4. Seed / Update Demo Shopper Account
    console.log("\n--- 4. Setting up Demo Shopper Account ---");
    const customerPasswordHash = await bcrypt.hash(DEMO_CUSTOMER.password, 10);
    let customer = await User.findOne({ email: DEMO_CUSTOMER.email });

    if (!customer) {
      customer = await User.create({
        fullName: DEMO_CUSTOMER.fullName,
        email: DEMO_CUSTOMER.email,
        passwordHash: customerPasswordHash,
        role: DEMO_CUSTOMER.role,
      });
      console.log(` Created Demo Shopper: ${DEMO_CUSTOMER.email}`);
    } else {
      customer.role = DEMO_CUSTOMER.role;
      customer.passwordHash = customerPasswordHash;
      await customer.save();
      console.log(` Updated Demo Shopper: ${DEMO_CUSTOMER.email}`);
    }

    // Also ensure legacy shopper credentials work
    const legacyPasswordHash = await bcrypt.hash(LEGACY_CUSTOMER.password, 10);
    let legacyUser = await User.findOne({ email: LEGACY_CUSTOMER.email });
    if (!legacyUser) {
      await User.create({
        fullName: LEGACY_CUSTOMER.fullName,
        email: LEGACY_CUSTOMER.email,
        passwordHash: legacyPasswordHash,
        role: LEGACY_CUSTOMER.role,
      });
      console.log(` Created Legacy Shopper: ${LEGACY_CUSTOMER.email}`);
    } else {
      legacyUser.passwordHash = legacyPasswordHash;
      legacyUser.role = "customer";
      await legacyUser.save();
      console.log(` Updated Legacy Shopper: ${LEGACY_CUSTOMER.email}`);
    }

    console.log("\n========================================================");
    console.log(" DEMO ACCOUNTS & STORE SETUP COMPLETE!");
    console.log("========================================================");
    console.log("🛒 DEMO SHOPPER (Customer):");
    console.log(`   Email:    ${DEMO_CUSTOMER.email}  (or ${LEGACY_CUSTOMER.email})`);
    console.log(`   Password: ${DEMO_CUSTOMER.password}   (or ${LEGACY_CUSTOMER.password})`);
    console.log("\n🏪 DEMO SHOPKEEPER:");
    console.log(`   Email:    ${DEMO_SHOPKEEPER.email}`);
    console.log(`   Password: ${DEMO_SHOPKEEPER.password}`);
    console.log(`   Store:    ${STORE_CONFIG.storeName} (${STORE_CONFIG.storeCode})`);
    console.log(`   Carts:    ${STORE_CONFIG.carts.join(", ")} (5 Total)`);
    console.log(`   Gates:    ${STORE_CONFIG.numberOfGates} Exit Gates`);
    console.log(`   Stock:    ${storeStock.length} Product items in stock`);
    console.log("========================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed demo error:", err);
    process.exit(1);
  }
}

seedDemo();
