 const axios = require("axios");
const { randomUUID } = require("node:crypto");
const Stripe = require("stripe");
const Cart = require("../models/cart.model");
const { CART_STATUS } = require("../models/cart.model");
const Store = require("../models/store.model");
const Transaction = require("../models/transaction.model");
const { notifyStockReduction, notifyCartStatusChange, notifyNewTransaction } = require("../socket");
const adafruitService = require("./adafruit.service");

/* -------------------------------------------------------------------------- */
/* Exit gate                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Write the gate feed: "ON" opens the barrier, "OFF" closes it.
 * Accepts gate number or key (e.g. 1 or "gate-1"). Default: Gate 1.
 */
const setExitGate = async (value, label = "", gateIdentifier = 1) => {
  return adafruitService.setGateState(gateIdentifier, value, label);
};

/**
 * Open the barrier, hold it for GATE_OPEN_MS (default 4s), then close it.
 * Accepts gate number or key (e.g. 1 or "gate-1"). Default: Gate 1.
 */
const pulseExitGate = async (label = "", gateIdentifier = 1, holdMs = null) => {
  return adafruitService.pulseGate(gateIdentifier, label, holdMs);
};

/* -------------------------------------------------------------------------- */
/* Cart state transitions                                                      */
/* -------------------------------------------------------------------------- */

const syncInventoryCart = async (sessionId, updater) => {
  const inventory = await Store.findOne({ "carts.sessionId": sessionId });
  if (!inventory) return;

  const physicalCart = inventory.carts.find((entry) => entry.sessionId === sessionId);
  if (!physicalCart) return;

  updater(physicalCart);
  await inventory.save();

  try {
    notifyCartStatusChange({
      storeCode: inventory.storeCode,
      cartCode: physicalCart.cartCode,
      status: physicalCart.status,
      sessionId: physicalCart.sessionId,
      carts: inventory.carts,
    });
  } catch (err) {
    console.warn("⚠️ Failed to notify cart status change:", err.message);
  }
};

const setCartStatus = async (cart, status) => {
  cart.status = status;
  await cart.save();

  await syncInventoryCart(cart.sessionId, (physicalCart) => {
    physicalCart.status = status;
  });

  return cart;
};

const completeCartSession = async (cart) => {
  // Stock was already deducted in real-time when the customer scanned/added items to the cart.
  // 1. Mark session completed and reset items
  cart.items = [];
  cart.totalPrice = 0;
  cart.totalWeight = 0;
  cart.status = CART_STATUS.COMPLETED;
  await cart.save();

  // 2. Hand the physical cart back to the store
  await syncInventoryCart(cart.sessionId, (physicalCart) => {
    physicalCart.status = CART_STATUS.FREE;
    physicalCart.sessionId = null;
    physicalCart.userId = null;
  });

  return cart;
};

/* -------------------------------------------------------------------------- */
/* Purchase history                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Snapshot a paid cart into the `transactions` collection.
 *
 * Must run before `completeCartSession` clears the cart. Upserting on
 * `sessionId` keeps retries idempotent, and a failed history write must never
 * block a shopper whose payment already succeeded.
 */
const recordTransaction = async (cart) => {
  const completedAt = new Date();

  let storeName = "BaskIt Supermarket";
  if (cart.storeCode || cart.sessionId) {
    const store = await Store.findOne({
      $or: [{ storeCode: cart.storeCode }, { "carts.sessionId": cart.sessionId }],
    });
    if (store?.storeName) storeName = store.storeName;
  }

  const snapshot = {
    sessionId: cart.sessionId,
    cartId: cart._id,
    userId: cart.userId,
    storeCode: cart.storeCode || null,
    storeName,
    cartCode: cart.cartCode || null,
    items: cart.items.map((item) => ({
      productId: item.productId,
      barcode: item.barcode,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
    })),
    totalAmount: cart.totalPrice || 0,
    totalWeight: cart.totalWeight || 0,
    paymentMethod: "Stripe Checkout",
    paymentStatus: "PAID",
    startedAt: cart.createdAt || completedAt,
    completedAt,
    // One-time exit pass encoded in the gate QR code.
    gateCode: randomUUID().replace(/-/g, ""),
    gateStatus: "Locked",
    gateUnlockedAt: null,
  };

  try {
    const doc = await Transaction.findOneAndUpdate(
      { sessionId: cart.sessionId },
      { $setOnInsert: snapshot },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (doc) {
      try {
        notifyNewTransaction({
          storeCode: doc.storeCode,
          transaction: {
            id: doc._id,
            sessionId: doc.sessionId,
            cartCode: doc.cartCode || "CART",
            customer: {
              fullName: "Customer",
              email: "Completed Shopper",
            },
            totalAmount: doc.totalAmount,
            totalWeight: doc.totalWeight,
            items: doc.items,
            itemsCount: (doc.items || []).reduce((s, it) => s + (it.quantity || 1), 0),
            paymentMethod: doc.paymentMethod,
            paymentStatus: doc.paymentStatus,
            gateCode: doc.gateCode,
            gateStatus: doc.gateStatus,
            completedAt: doc.completedAt,
          },
        });
      } catch (socketErr) {
        console.warn("⚠️ Failed to emit new transaction event:", socketErr.message);
      }
    }

    return doc;
  } catch (err) {
    // 11000 = another verification already inserted this session.
    if (err?.code === 11000) {
      return Transaction.findOne({ sessionId: cart.sessionId });
    }

    console.error("Could not record transaction:", err.message);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Stripe Checkout                                                             */
/* -------------------------------------------------------------------------- */

const secretKey = () => String(process.env.STRIPE_SECRET_KEY || "").trim();
const isStripeConfigured = () => Boolean(secretKey());
const stripeCurrency = () => String(process.env.STRIPE_CURRENCY || "inr").toLowerCase();
const frontendUrl = () =>
  String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

let stripeClient = null;

const getStripe = () => {
  if (!isStripeConfigured()) return null;
  if (!stripeClient) stripeClient = new Stripe(secretKey());
  return stripeClient;
};

const toMinorUnits = (amount) => Math.round((Number(amount) || 0) * 100);

// Currencies Stripe treats as zero-decimal (the API amount has no cents).
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

const currencyFactor = (currency) =>
  ZERO_DECIMAL_CURRENCIES.has(String(currency).toLowerCase()) ? 1 : 100;

const formatMoney = (amount, currency) => {
  const code = String(currency || "").toUpperCase();
  const value = Number(amount) || 0;

  if (code === "INR") return `₹${value.toFixed(2)}`;
  if (ZERO_DECIMAL_CURRENCIES.has(code.toLowerCase())) return `${code} ${Math.round(value)}`;
  return `${code} ${value.toFixed(2)}`;
};

// Stripe's minimum is 0.50 USD-equivalent after settlement conversion, so a
// currency like INR needs roughly ₹50 even though Stripe's local INR minimum
// is only ₹0.50. The exact floor depends on the account's settlement currency.
const MINIMUM_HINT = {
  inr: "about ₹50 (US$0.50 equivalent)",
  usd: "US$0.50",
  eur: "€0.50",
  gbp: "£0.30",
  aed: "AED 2.00",
  aud: "A$0.50",
  cad: "C$0.50",
  sgd: "S$0.50",
};

const minimumHint = (currency) =>
  MINIMUM_HINT[String(currency).toLowerCase()] ||
  `the US$0.50 equivalent in ${String(currency).toUpperCase()}`;

// Optional app-level floor (in major units), e.g. STRIPE_MIN_CHARGE=50 for INR.
const configuredMinCharge = () => {
  const raw = Number(process.env.STRIPE_MIN_CHARGE);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

const httpError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.isAppError = true;
  return err;
};

const isMinimumAmountError = (err) =>
  err?.code === "amount_too_small" ||
  /must convert to at least|amount_too_small|amount.*too small/i.test(err?.message || "");

/**
 * Create a Stripe-hosted Checkout Session for the cart. The shopper is sent to
 * Stripe's page; no card data ever passes through this app.
 */
const createCheckoutSession = async (cart) => {
  const stripe = getStripe();

  if (!stripe) {
    throw httpError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env and restart the server.",
      503
    );
  }

  if (!cart.items.length) {
    throw httpError("Your cart is empty. Add a product before paying.", 409);
  }

  const unpricedItem = cart.items.find((item) => toMinorUnits(item.price) < 1);
  if (unpricedItem) {
    throw httpError(`${unpricedItem.productName} has no payable price.`, 409);
  }

  const currency = stripeCurrency();
  const minCharge = configuredMinCharge();
  const total = Number(cart.totalPrice) || 0;

  if (minCharge > 0 && total < minCharge) {
    throw httpError(
      `Stripe requires a minimum payment of ${formatMoney(minCharge, currency)}. ` +
        `Your cart total is ${formatMoney(total, currency)} — add more items before paying.`,
      409
    );
  }

  const base = frontendUrl();

  try {
    return await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: toMinorUnits(item.price),
          product_data: { name: item.productName },
        },
      })),
      // Stripe replaces {CHECKOUT_SESSION_ID} with the real session id.
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard?payment=cancelled`,
      client_reference_id: cart.sessionId,
      metadata: {
        sessionId: cart.sessionId,
        cartId: String(cart._id),
        userId: String(cart.userId),
      },
      billing_address_collection: "auto",
    });
  } catch (err) {
    // Stripe enforces a US$0.50-equivalent minimum on the total; surface it as
    // an actionable cart error instead of a generic gateway failure.
    if (isMinimumAmountError(err)) {
      throw httpError(
        `This cart total (${formatMoney(total, currency)}) is below Stripe's minimum ` +
          `of ${minimumHint(currency)}. Add more items before paying.`,
        409
      );
    }

    throw err;
  }
};

const retrieveCheckoutSession = async (checkoutSessionId) => {
  const stripe = getStripe();

  if (!stripe) {
    throw httpError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env and restart the server.",
      503
    );
  }

  return stripe.checkout.sessions.retrieve(checkoutSessionId);
};

/**
 * Confirm a Stripe Checkout Session and, only when Stripe reports it paid,
 * snapshot the purchase and complete the cart.
 *
 * The gate is no longer opened here: completion issues a one-time gate pass
 * (QR + code) which the shopper presents to the exit scanner.
 *
 * Idempotent: refreshing the success page returns the same pass and never
 * re-opens the gate.
 */
const finalizeCheckoutSession = async (stripeSession, userId) => {
  const cartSessionId =
    stripeSession?.metadata?.sessionId || stripeSession?.client_reference_id;

  if (!cartSessionId) {
    throw httpError("This payment is not linked to a cart session.", 400);
  }

  const cart = await Cart.findOne({ sessionId: cartSessionId });

  if (!cart) {
    throw httpError("The cart for this payment no longer exists.", 404);
  }

  if (String(cart.userId) !== String(userId)) {
    throw httpError("This payment belongs to a different shopper.", 403);
  }

  if (stripeSession.payment_status !== "paid") {
    return {
      paid: false,
      cart,
      transaction: null,
      alreadyCompleted: false,
    };
  }

  const alreadyCompleted =
    cart.status === CART_STATUS.FREE && cart.items.length === 0;

  let transaction;

  if (alreadyCompleted) {
    // Return the existing pass if the success page is refreshed.
    transaction = await Transaction.findOne({ sessionId: cart.sessionId });

    // Carts completed before purchase history existed (or while an older
    // server was running) have no transaction. Issue a pass anyway: Stripe has
    // already confirmed the payment, so the shopper must still be able to exit.
    if (!transaction) {
      transaction = await recordTransaction(cart);
    }
  } else {
    // Save the purchase before the cart is emptied.
    transaction = await recordTransaction(cart);
    await completeCartSession(cart);
  }

  // Backfill a pass for transactions written before gate passes existed.
  if (transaction && !transaction.gateCode) {
    transaction.gateCode = randomUUID().replace(/-/g, "");
    transaction.gateStatus = transaction.gateStatus || "Locked";

    try {
      await transaction.save();
    } catch (err) {
      console.error("Could not backfill gate pass:", err.message);
      transaction = null;
    }
  }

  return { paid: true, cart, transaction, alreadyCompleted };
};

/**
 * Build the exit-pass payload shown as a QR code on the success page.
 * The URL points at the gate scanner endpoint (public, single-use token).
 */
const buildGatePass = (transaction, origin = "") => {
  if (!transaction?.gateCode) return null;

  const base = String(
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    origin ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");

  return {
    code: transaction.gateCode,
    status: transaction.gateStatus || "Locked",
    unlockedAt: transaction.gateUnlockedAt || null,
    url: `${base}/gate/unlock/${encodeURIComponent(transaction.gateCode)}`,
  };
};

const buildReceipt = (stripeSession, result, fallbackEmail) => ({
  transactionId: stripeSession.id,
  checkoutSessionId: stripeSession.id,
  paymentIntent:
    typeof stripeSession.payment_intent === "string"
      ? stripeSession.payment_intent
      : stripeSession.payment_intent?.id || null,
  amount: (Number(stripeSession.amount_total) || 0) / 100,
  currency: String(stripeSession.currency || "").toUpperCase(),
  paymentMethod: "Stripe Checkout",
  status: "PAID",
  storeName: result.transaction?.storeName || "BaskIt Supermarket",
  cartCode: result.transaction?.cartCode || null,
  itemsCount: (result.transaction?.items || []).reduce((s, it) => s + (it.quantity || 1), 0),
  gateStatus: result.transaction?.gateStatus || "Locked",
  paidAt: new Date().toISOString(),
  customerEmail: stripeSession.customer_details?.email || fallbackEmail || null,
  alreadyProcessed: result.alreadyCompleted,
});

module.exports = {
  isStripeConfigured,
  createCheckoutSession,
  retrieveCheckoutSession,
  finalizeCheckoutSession,
  buildReceipt,
  buildGatePass,
  setCartStatus,
  completeCartSession,
  pulseExitGate,
  setExitGate,
};
