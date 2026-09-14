const Product = require("../models/product.model");

const findProductByBarcode = async (barcode) => {
  if (!barcode) return null;
  return await Product.findOne({ productBarcode: String(barcode).trim() });
};

const findProductByNameAndManufacturer = async (productName, manufacturer) => {
  return await Product.findOne({
    productName: String(productName).trim(),
    manufacturer: String(manufacturer).trim(),
  });
};

const findProductById = async (id) => {
  return await Product.findById(id);
};

const findProducts = async (filter = {}, limit = 200) => {
  return await Product.find(filter).sort({ productName: 1 }).limit(limit);
};

const findProductsByNames = async (names) => {
  if (!Array.isArray(names) || names.length === 0) return [];
  return await Product.find({ productName: { $in: names } });
};

const findDuplicateBarcode = async (barcode, excludeId) => {
  const query = { productBarcode: String(barcode).trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return await Product.findOne(query);
};

const upsertProductByBarcode = async (barcode, data) => {
  return await Product.findOneAndUpdate(
    { productBarcode: String(barcode).trim() },
    { $setOnInsert: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const createProduct = async (productData) => {
  return await Product.create(productData);
};

const countProducts = async () => {
  return await Product.countDocuments();
};

const saveProduct = async (product) => {
  return await product.save();
};

module.exports = {
  findProductByBarcode,
  findProductByNameAndManufacturer,
  findProductById,
  findProducts,
  findProductsByNames,
  findDuplicateBarcode,
  upsertProductByBarcode,
  createProduct,
  countProducts,
  saveProduct,
};
