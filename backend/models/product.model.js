const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/**
 * Global product catalogue / lookup table.
 *
 * Products are shared reference data (barcode -> name, manufacturer, price, weight).
 * Store-specific stock is stored in the Store inventory.
 */
const productSchema = new Schema(
    {
        productName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        productBarcode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
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

        // Unit weight in grams (used by the smart cart's load sensor).
        weight: {
            type: Number,
            min: 0,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema, "product_catalog");
