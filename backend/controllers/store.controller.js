const express = require("express");
const router = express.Router();
const storeService = require("../service/store.service");
const { toPublicStoreDTO } = require("../dto/store.dto");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * POST /store/scan
 * Selects a supermarket by its name (via QR code scan or manual entry).
 */
router.post(
  "/scan",
  asyncHandler(async (req, res) => {
    const rawInput =
      req.body?.storeName ?? req.body?.name ?? req.body?.storeCode ?? req.body?.code;

    const store = await storeService.findStoreByName(rawInput);
    const storeDTO = toPublicStoreDTO(store);

    return res.json({
      error: false,
      message: `${storeDTO.storeName} selected. Now scan a cart.`,
      store: storeDTO,
    });
  })
);

module.exports = router;
