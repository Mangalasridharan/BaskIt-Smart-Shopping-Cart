const productRepo = require("../repository/product.repo");
const AppError = require("../middleware/AppError");

const toProductDto = (product) => {
  if (!product) return null;
  return {
    id: product._id,
    _id: product._id,
    productName: product.productName,
    product_name: product.productName,
    productBarcode: product.productBarcode,
    barcode: product.productBarcode,
    manufacturer: product.manufacturer,
    price: product.price,
    weight: product.weight,
  };
};

const getProducts = async (searchTerm = "") => {
  const search = String(searchTerm || "").trim();
  const filter = search
    ? {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { manufacturer: { $regex: search, $options: "i" } },
          { productBarcode: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const products = await productRepo.findProducts(filter, 200);
  return products.map(toProductDto);
};

const getProductByBarcode = async (barcode) => {
  const cleanBarcode = String(barcode || "").trim();
  if (!cleanBarcode) {
    throw new AppError("Barcode is required", 400);
  }

  const product = await productRepo.findProductByBarcode(cleanBarcode);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return toProductDto(product);
};

module.exports = {
  getProducts,
  getProductByBarcode,
  toProductDto,
};
