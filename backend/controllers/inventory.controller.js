const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Inventory = require("../models/inventory.model");

// Helper: Seed initial products from products.json if empty
const seedFromProductsJson = async () => {
  try {
    const count = await Inventory.countDocuments();
    if (count > 0) return;

    // Search in root or backend
    const possiblePaths = [
      path.join(__dirname, "../../products.json"),
      path.join(__dirname, "../products.json"),
      path.join(process.cwd(), "products.json"),
    ];

    let productsData = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        productsData = JSON.parse(raw);
        break;
      }
    }

    if (!productsData) return;

    const seedItems = Object.entries(productsData).map(([barcode, item]) => ({
      barcode,
      product_name: item.product_name,
      manufacturer: item.manufacturer,
      price: Number(item.price),
      stockQuantity: Math.floor(Math.random() * 40) + 15,
      weight: Number(item.weight),
      category: item.category || "Grocery",
      updatedAt: new Date(),
    }));

    if (seedItems.length > 0) {
      await Inventory.insertMany(seedItems);
      console.log(`✅ Seeded ${seedItems.length} products into Inventory collection`);
    }
  } catch (err) {
    console.error("Error auto-seeding inventory:", err.message);
  }
};

// GET /inventory - List all products
router.get("/", async (req, res) => {
  try {
    let items = await Inventory.find().sort({ product_name: 1 });
    if (items.length === 0) {
      await seedFromProductsJson();
      items = await Inventory.find().sort({ product_name: 1 });
    }

    return res.json({
      error: false,
      items,
      count: items.length,
    });
  } catch (err) {
    console.error("Error fetching inventory:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch inventory" });
  }
});

// GET /inventory/stats - Dashboard analytics for shopkeeper
router.get("/stats", async (req, res) => {
  try {
    const items = await Inventory.find();
    const totalProducts = items.length;
    const totalStock = items.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (item.price * (item.stockQuantity || 0)), 0);
    const lowStockCount = items.filter((item) => (item.stockQuantity || 0) < 10).length;

    return res.json({
      error: false,
      stats: {
        totalProducts,
        totalStock,
        totalValue: Math.round(totalValue),
        lowStockCount,
      },
    });
  } catch (err) {
    console.error("Error fetching inventory stats:", err);
    return res.status(500).json({ error: true, message: "Failed to fetch inventory stats" });
  }
});

// POST /inventory - Add new product
router.post("/", async (req, res) => {
  try {
    const { barcode, product_name, manufacturer, price, stockQuantity, weight, category } = req.body;

    if (!barcode || !product_name || !manufacturer || price === undefined || weight === undefined) {
      return res.status(400).json({ error: true, message: "Required fields missing" });
    }

    const existing = await Inventory.findOne({ barcode: barcode.trim() });
    if (existing) {
      return res.status(400).json({ error: true, message: "Product with this barcode already exists" });
    }

    const item = new Inventory({
      barcode: barcode.trim(),
      product_name: product_name.trim(),
      manufacturer: manufacturer.trim(),
      price: Number(price),
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 50,
      weight: Number(weight),
      category: category || "Packaged Goods",
      updatedAt: new Date(),
    });

    await item.save();
    return res.status(201).json({
      error: false,
      message: "Product added to inventory successfully",
      item,
    });
  } catch (err) {
    console.error("Error adding inventory product:", err);
    return res.status(500).json({ error: true, message: "Failed to create product" });
  }
});

// PUT /inventory/:id - Update product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    const updated = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    return res.json({
      error: false,
      message: "Product updated successfully",
      item: updated,
    });
  } catch (err) {
    console.error("Error updating inventory:", err);
    return res.status(500).json({ error: true, message: "Failed to update product" });
  }
});

// DELETE /inventory/:id - Remove product
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Inventory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    return res.json({
      error: false,
      message: "Product deleted from inventory",
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    return res.status(500).json({ error: true, message: "Failed to delete product" });
  }
});

// POST /inventory/seed - Re-seed from file
router.post("/seed", async (req, res) => {
  try {
    await seedFromProductsJson();
    const count = await Inventory.countDocuments();
    return res.json({ error: false, message: `Inventory seeded. Total items: ${count}` });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
});

module.exports = router;
