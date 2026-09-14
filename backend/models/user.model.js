const mongoose = require("mongoose");

/**
 * User schema — covers both email/password and Google OAuth accounts.
 *
 * Auth design:
 *  - Email+password users:  passwordHash is set, googleId is null.
 *  - Google OAuth users:    googleId is set, passwordHash is null.
 *  - Linked accounts:       both fields are set (passwordHash + googleId).
 *
 * authProviders is NOT stored — it is derived from passwordHash / googleId
 * in the DTO layer (dto/user.dto.js) to avoid redundant, out-of-sync state.
 *
 * Role design:
 *  - "customer"    → can scan products, manage cart, pay.
 *  - "shopkeeper"  → manages store inventory.
 */
const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,   // always stored in lower-case
            trim: true,
            maxlength: 254,    // RFC 5321 maximum
        },

        // Bcrypt hash of the user's password.
        // null for pure Google OAuth accounts — never expose this to the client.
        passwordHash: {
            type: String,
            required: false,   // Google OAuth users have no password
            select: false,     // excluded from every query by default
        },

        // Google's stable user identifier (the "sub" field from the ID token).
        // null until the user signs in via Google.
        googleId: {
            type: String,
            required: false,
            unique: true,
            sparse: true,      // allows multiple documents with null googleId
            select: false,     // never send this to the client
        },

        // ── Role ───────────────────────────────────────────────────────────────
        // "customer"   → shopper (cart, payment).
        // "shopkeeper" → store manager (inventory).
        // Do NOT change these values — they are stored in the DB and in JWTs.
        role: {
            type: String,
            enum: ["customer", "shopkeeper"],
            default: "customer",
            required: true,
        },

        // Soft-delete / suspension flag. false = account disabled.
        isActive: {
            type: Boolean,
            default: true,
        },

        // Set when the user verifies their email address.
        // Google OAuth accounts are considered verified immediately on first sign-in.
        emailVerifiedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,    // auto-manages createdAt / updatedAt
        versionKey: false,   // removes the __v field from documents
    }
);

module.exports = mongoose.model("User", userSchema, "users");
