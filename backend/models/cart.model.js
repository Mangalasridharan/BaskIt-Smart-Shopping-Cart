const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CART_STATUS = {
    FREE: "Free",
    IN_PURCHASE: "In Purchase",
    PAYMENT: "Payment",
    COMPLETED: "Completed",
    ABANDONED: "Abandoned",
};

const cartItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: false,
        },

        barcode: {
            type: String,
            required: false,
            trim: true,
        },

        productName: {
            type: String,
            required: true,
            trim: true,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },

        // Total weight for this line (unit weight x quantity), in grams.
        weight: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

/**
 * A smart-cart shopping session.
 *
 * A new document (with a fresh sessionId) is created when a shopper scans a
 * cart QR in a store. Items are dynamically added while shopping.
 */
const cartSchema = new Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        storeCode: {
            type: String,
            required: false,
            trim: true,
            uppercase: true,
            index: true,
        },

        cartCode: {
            type: String,
            required: false,
            trim: true,
            uppercase: true,
        },

        items: {
            type: [cartItemSchema],
            default: [],
        },

        totalPrice: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalWeight: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: Object.values(CART_STATUS),
            default: CART_STATUS.FREE,
            index: true,
        },
    },
    { timestamps: true }
);

// Compound indexes for active shopper session lookups and store session analytics
cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ storeCode: 1, createdAt: -1 });

const Cart = mongoose.model("Cart", cartSchema, "carts");

module.exports = Cart;
module.exports.CART_STATUS = CART_STATUS;
module.exports.SESSION_STATUS = CART_STATUS;
module.exports.cartItemSchema = cartItemSchema;
