const express = require("express");
const router = express.Router();
const productService = require("../service/product.service");
const asyncHandler = require("../middleware/asyncHandler");

// GET /products - Shared catalogue lookup list
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = req.query.search;
    const products = await productService.getProducts(search);

    return res.json({
      error: false,
      products,
      count: products.length,
    });
  })
);

// GET /products/barcode/:barcode - Barcode lookup
router.get(
  "/barcode/:barcode",
  asyncHandler(async (req, res) => {
    const product = await productService.getProductByBarcode(req.params.barcode);
    return res.json({ error: false, product });
  })
);

module.exports = router;
