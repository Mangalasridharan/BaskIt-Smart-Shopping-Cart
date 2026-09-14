const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { CART_STATUS } = require("./cart.model");

const Schema = mongoose.Schema;

// Readable, unique code printed on the supermarket's QR sign.
const generateStoreCode = () =>
    `STORE-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

/**
 * One physical smart cart registered to this store.
 * `cartCode` is the value encoded in the QR code on the cart.
 */
const physicalCartSchema = new Schema(
    {
        cartCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        status: {
            type: String,
            enum: Object.values(CART_STATUS),
            default: CART_STATUS.FREE,
        },

        sessionId: {
            type: String,
            default: null,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { _id: false }
);

/**
 * Shelf stock inside this store.
 */
const storeStockSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

/**
 * Supermarket Store Model:
 * Consolidates the supermarket identity, exit gates, physical cart fleet, and shelf inventory.
 */
const storeSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
            alias: "shopkeeperId",
        },

        storeCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            uppercase: true,
            trim: true,
            default: generateStoreCode,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            default: "BaskIt Supermarket",
            alias: "storeName",
        },

        // Shelf inventory stocked in this store
        products: {
            type: [storeStockSchema],
            default: [],
            alias: "inventory",
        },

        // Physical carts fleet assigned to this store
        carts: {
            type: [physicalCartSchema],
            default: [],
        },

        numberOfGates: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const Store = mongoose.model("Store", storeSchema, "stores");

module.exports = Store;
module.exports.generateStoreCode = generateStoreCode;
module.exports.CART_STATUS = CART_STATUS;
