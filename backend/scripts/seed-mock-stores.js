/**
 * Seed mock supermarkets so the store -> cart scan flow can be tested without
 * physical QR codes.
 *
 * Run with: npm run seed:stores
 *
 * Idempotent: existing stores/accounts are left in place; missing carts are
 * added without resetting any cart that is currently in use.
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user.model");
const Store = require("../models/store.model");

const CART_CODES = ["CART-01", "CART-02", "CART-03", "CART-04", "CART-05"];
const MOCK_PASSWORD = "shopkeeper@123";

const MOCK_STORES = [
  {
    storeCode: "BASKIT-MART",
    storeName: "BaskIt Supermarket",
    managerName: "BaskIt Manager",
    email: "shopkeeper@baskit.com",
  },
  {
    storeCode: "FRESH-MART",
    storeName: "FreshMart Grocers",
    managerName: "FreshMart Manager",
    email: "freshmart@baskit.test",
  },
  {
    storeCode: "DAILY-STORE",
    storeName: "Daily Needs Store",
    managerName: "Daily Needs Manager",
    email: "dailyneeds@baskit.test",
  },
  {
    storeCode: "CITY-BAZAAR",
    storeName: "City Bazaar",
    managerName: "City Bazaar Manager",
    email: "citybazaar@baskit.test",
  },
];

const connectionString =
  process.env.MONGODB_URI || require("../config.json").connectionString;

const seedStore = async ({ storeCode, storeName, managerName, email }) => {
  let shopkeeper = await User.findOne({ email });

  if (!shopkeeper) {
    shopkeeper = await User.create({
      fullName: managerName,
      email,
      passwordHash: await bcrypt.hash(MOCK_PASSWORD, 10),
      role: "shopkeeper",
    });
    console.log(`created shopkeeper ${email}`);
  }

  let inventory = await Store.findOne({
    $or: [{ ownerId: shopkeeper._id }, { storeCode }],
  });

  if (!inventory) {
    inventory = await Store.create({
      shopkeeperId: shopkeeper._id,
      storeCode,
      storeName,
      products: [],
      carts: CART_CODES.map((cartCode) => ({ cartCode })),
    });
    console.log(`created store ${storeCode} (${storeName})`);
    return;
  }

  let changed = false;

  if (!inventory.storeCode) {
    inventory.storeCode = storeCode;
    changed = true;
  }

  if (!inventory.storeName) {
    inventory.storeName = storeName;
    changed = true;
  }

  const existingCodes = new Set(inventory.carts.map((cart) => cart.cartCode));
  for (const cartCode of CART_CODES) {
    if (!existingCodes.has(cartCode)) {
      inventory.carts.push({ cartCode });
      changed = true;
    }
  }

  if (changed) {
    await inventory.save();
    console.log(`updated store ${inventory.storeCode} (${inventory.storeName})`);
  } else {
    console.log(`store ${inventory.storeCode} already seeded`);
  }
};

mongoose
  .connect(connectionString)
  .then(async () => {
    for (const store of MOCK_STORES) {
      await seedStore(store);
    }

    console.log("\nMock supermarket codes:");
    for (const store of MOCK_STORES) {
      console.log(`  ${store.storeCode.padEnd(14)} ${store.storeName}`);
    }
    console.log(
      `\nMock shopkeeper logins use password: ${MOCK_PASSWORD} (User demo creds unchanged)`
    );

    await mongoose.disconnect();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
