const express = require("express");
const router = express.Router();
const inventoryService = require("../service/inventory.service");
const asyncHandler = require("../middleware/asyncHandler");

// GET /inventory - List this shopkeeper's stock
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await inventoryService.getInventory(req.user._id);
    return res.json({
      error: false,
      ...data,
    });
  })
);

// GET /inventory/stats - Dashboard analytics for this shopkeeper
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await inventoryService.getStats(req.user._id);
    return res.json({
      error: false,
      stats,
    });
  })
);

// GET /inventory/transactions - Retrieve transaction purchase history for this store
router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const data = await inventoryService.getTransactions(req.user._id);
    return res.json({
      error: false,
      ...data,
    });
  })
);

// POST /inventory - Add a product to this shopkeeper's inventory
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const item = await inventoryService.addProductToInventory(req.user._id, req.body);
    return res.status(201).json({
      error: false,
      message: "Product added to inventory successfully",
      item,
    });
  })
);

// PUT /inventory/:productId - Update catalogue details and/or this store's stock
router.put(
  "/:productId",
  asyncHandler(async (req, res) => {
    const item = await inventoryService.updateInventoryProduct(
      req.user._id,
      req.params.productId,
      req.body
    );
    return res.json({
      error: false,
      message: "Inventory item updated successfully",
      item,
    });
  })
);

// DELETE /inventory/:productId - Remove this product from this shopkeeper's store
router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const result = await inventoryService.removeProductFromInventory(
      req.user._id,
      req.params.productId
    );
    return res.json({
      error: false,
      message: result.message,
    });
  })
);

// POST /inventory/seed - Add missing sample products to this shopkeeper's store
router.post(
  "/seed",
  asyncHandler(async (req, res) => {
    const result = await inventoryService.seedFromProductsJson(req.user._id);
    return res.json({
      error: false,
      message: `Inventory synced. Added ${result.inserted} new item(s).`,
      ...result,
    });
  })
);

// POST /inventory/cart - Add a new cart to this store
router.post(
  "/cart",
  asyncHandler(async (req, res) => {
    const carts = await inventoryService.addCartToStore(req.user._id, req.body?.cartCode);
    return res.status(201).json({
      error: false,
      message: `Cart ${String(req.body?.cartCode).trim().toUpperCase()} registered successfully`,
      carts,
    });
  })
);

// POST /inventory/cart/:cartCode/reset - Reset a cart's status back to Free
router.post(
  "/cart/:cartCode/reset",
  asyncHandler(async (req, res) => {
    const code = String(req.params.cartCode).trim().toUpperCase();
    const carts = await inventoryService.resetCartStatus(req.user._id, code);
    return res.json({
      error: false,
      message: `Cart ${code} status reset to Free`,
      carts,
    });
  })
);

// POST /inventory/gate/pulse - Test trigger the exit barrier
router.post(
  "/gate/pulse",
  asyncHandler(async (req, res) => {
    const gateNumber = req.body?.gateNumber || req.body?.gate || 1;
    const result = await inventoryService.pulseGate(gateNumber);
    return res.json({
      error: false,
      message: result.opened
        ? `Exit Gate #${gateNumber} barrier opened & cycled successfully!`
        : `Gate #${gateNumber} signal sent (Adafruit simulated). Barrier cycled.`,
      gate: result,
    });
  })
);

// POST /inventory/gate/sync - Re-sync/provision all gate buttons on Adafruit IO
router.post(
  "/gate/sync",
  asyncHandler(async (req, res) => {
    const result = await inventoryService.syncGates(req.user._id);
    return res.json({
      error: !result.success,
      message: result.success
        ? `Successfully synced ${result.numberOfGates} gate button(s) in "${result.storeName}" dashboard on Adafruit IO in closed (OFF) state.`
        : "Failed to sync gates with Adafruit IO. Check your AIO credentials.",
      details: result.details,
    });
  })
);

module.exports = router;
