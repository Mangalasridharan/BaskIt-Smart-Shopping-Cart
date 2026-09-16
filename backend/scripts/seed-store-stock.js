const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Product = require("../models/product.model");
const Store = require("../models/store.model");

const connectionString =
  process.env.MONGODB_URI || require("../config.json").connectionString;

async function seedStock() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(connectionString);
    console.log("Connected to MongoDB.");

    // Load products.json
    const possiblePaths = [
      path.join(__dirname, "../../products.json"),
      path.join(__dirname, "../products.json"),
      path.join(process.cwd(), "products.json"),
    ];

    let productsData = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        productsData = JSON.parse(fs.readFileSync(p, "utf-8"));
        console.log(`Loaded products from: ${p}`);
        break;
      }
    }

    if (!productsData) {
      console.error("❌ products.json could not be found!");
      process.exit(1);
    }

    // 1. Upsert into Product catalogue
    console.log("Upserting products into Product catalogue...");
    const productsList = [];
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
      productsList.push(product);
    }
    console.log(`✅ Upserted ${productsList.length} products in Product catalogue.`);

    // 2. Find stores
    const stores = await Store.find({});
    if (stores.length === 0) {
      console.warn("⚠️ No stores found in the database. Please register a store first.");
      process.exit(0);
    }

    // 3. Populate stock in each store
    for (const store of stores) {
      console.log(`\nUpdating shelf stock for store: "${store.name}" (${store.storeCode})`);

      const existingProductIds = new Set(
        store.products.map((entry) => String(entry.productId))
      );

      let addedCount = 0;
      let updatedCount = 0;

      for (const product of productsList) {
        const prodIdStr = String(product._id);
        const existingEntry = store.products.find(
          (entry) => String(entry.productId) === prodIdStr
        );

        if (existingEntry) {
          // If existing quantity was 0, assign a realistic shelf quantity
          if (existingEntry.quantity <= 0) {
            existingEntry.quantity = Math.floor(Math.random() * 35) + 20; // 20 - 54 items
            updatedCount++;
          }
        } else {
          // Add new stock entry
          store.products.push({
            productId: product._id,
            quantity: Math.floor(Math.random() * 35) + 20, // 20 - 54 items
          });
          existingProductIds.add(prodIdStr);
          addedCount++;
        }
      }

      await store.save();
      console.log(
        `✅ Store "${store.name}" now has ${store.products.length} products (added: ${addedCount}, updated: ${updatedCount}).`
      );
    }

    console.log("\n🎉 Stock data successfully seeded!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding store stock:", error);
    process.exit(1);
  }
}

seedStock();
