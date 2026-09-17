const express = require("express");
const router = express.Router();
const cartService = require("../service/cart.service");
const { toCartDto } = require("../dto/cart.dto");
const asyncHandler = require("../middleware/asyncHandler");

// POST /cart/store/scan - Forward to /store/scan for backwards compatibility
router.post("/store/scan", (req, res, next) => {
  const storeController = require("./store.controller");
  req.url = "/scan";
  return storeController(req, res, next);
});

// POST /cart/scan - Start a shopping session by scanning a cart QR / code
router.post(
  "/scan",
  asyncHandler(async (req, res) => {
    const result = await cartService.startCartSession(req.user, req.body);
    if (result.isExisting) {
      return res.json({
        error: false,
        message: result.message,
        cart: result.cart,
      });
    }

    return res.status(201).json({
      error: false,
      message: result.message,
      cartCode: result.cartCode,
      store: result.store,
      cart: result.cart,
    });
  })
);

// GET /cart/active - The customer's current shopping session
router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const result = await cartService.getActiveCart(req.user);
    return res.json({
      error: false,
      cart: result.cart,
    });
  })
);

// POST /cart/payment/initiate - Mark the session as being paid for
router.post(
  "/payment/initiate",
  asyncHandler(async (req, res) => {
    const result = await cartService.initiatePayment(req.user);
    return res.json({
      error: false,
      message: result.message,
      cart: result.cart,
    });
  })
);

// POST /cart/add-product or /cart/items - Add / scan a product into active cart
const addProduct = asyncHandler(async (req, res) => {
  const result = await cartService.addProductToCart(req.user, req.body);
  return res.json({
    error: false,
    product: result.product,
    cart: result.cart,
    message: "Product added to cart successfully",
  });
});

// GET /cart/get-all-products or /cart/items - Get all products in active cart
const getAllProducts = asyncHandler(async (req, res) => {
  const result = await cartService.getAllCartProducts(req.user);
  return res.json({
    error: false,
    products: result.products,
    cart: result.cart,
    message: result.message || "All Products retreived successfully",
  });
});

// DELETE /cart/remove-product/:productName or /cart/items/:productName - Remove product from cart
const removeProduct = asyncHandler(async (req, res) => {
  const productName = req.params.productName;
  const barcode = req.body?.productBarcode ?? req.body?.barcode;
  const result = await cartService.removeProductFromCart(req.user, productName, barcode);
  return res.json({
    error: false,
    message: result.message,
    ...(result.remainingQuantity ? { remainingQuantity: result.remainingQuantity } : {}),
    cart: result.cart,
  });
});

router.post("/items", addProduct);
router.post("/add-product", addProduct);
router.get("/items", getAllProducts);
router.get("/get-all-products", getAllProducts);
router.delete("/items/:productName", removeProduct);
router.delete("/remove-product/:productName", removeProduct);

module.exports = router;
module.exports.addProduct = addProduct;
module.exports.getAllProducts = getAllProducts;
module.exports.removeProduct = removeProduct;
module.exports.toCartDto = toCartDto;
