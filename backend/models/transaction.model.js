const mongoose = require("mongoose");
const { cartItemSchema } = require("./cart.model");

const Schema = mongoose.Schema;

/**
 * A completed purchase.
 *
 * Written once, when payment is confirmed, before the shopper's cart is cleared.
 * Stores an immutable snapshot of purchased lines, totals, and the exit pass.
 */
const transactionSchema = new Schema(
    {
        // The cart session this purchase belongs to. Unique: a session can only
        // be paid once, which makes the write idempotent.
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        cartId: {
            type: Schema.Types.ObjectId,
            ref: "Cart",
            required: false,
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
            index: true,
        },

        storeName: {
            type: String,
            required: false,
            trim: true,
        },

        cartCode: {
            type: String,
            required: false,
            trim: true,
        },

        // Snapshot of the purchased lines (productId, barcode, name, price, quantity, weight).
        items: {
            type: [cartItemSchema],
            default: [],
        },

        totalAmount: {
            type: Number,
            required: false,
            default: 0,
            min: 0,
        },

        totalWeight: {
            type: Number,
            required: false,
            default: 0,
            min: 0,
        },

        paymentMethod: {
            type: String,
            default: "Stripe Card",
        },

        paymentStatus: {
            type: String,
            enum: ["PAID", "REFUNDED"],
            default: "PAID",
        },

        // When the shopping session began.
        startedAt: {
            type: Date,
            default: Date.now,
        },

        // When payment was confirmed.
        completedAt: {
            type: Date,
            default: Date.now,
        },

        // One-time exit pass encoded in the gate QR code.
        gateCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        // Gate lifecycle: Locked until the pass is scanned.
        gateStatus: {
            type: String,
            enum: ["Locked", "Unlocked"],
            default: "Locked",
        },

        gateUnlockedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound indexes for store analytics and customer purchase history
transactionSchema.index({ storeCode: 1, completedAt: -1 });
transactionSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema, "transactions");
