const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  product_name: {
    type: String,
    required: true,
    trim: true,
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  stockQuantity: {
    type: Number,
    required: true,
    default: 50,
    min: 0,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
    default: "Packaged Goods",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Inventory", inventorySchema);
