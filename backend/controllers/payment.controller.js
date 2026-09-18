const express = require("express");
const router = express.Router();

const cartRepo = require("../repository/cart.repo");
const { CART_STATUS } = require("../models/cart.model");
const paymentService = require("../service/payment.service");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../middleware/AppError");

// POST /payment/checkout-session
// Creates a Stripe-hosted Checkout Session and returns its URL.
router.post(
  "/checkout-session",
  asyncHandler(async (req, res) => {
    if (!paymentService.isStripeConfigured()) {
      throw new AppError(
        "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env and restart the server.",
        503
      );
    }

    const cart = await cartRepo.findActiveCartByUser(req.user._id);

    if (!cart) {
      throw new AppError("No active cart session. Scan a cart before paying.", 404);
    }

    if (!cart.items.length) {
      throw new AppError("Your cart is empty. Add a product before paying.", 409);
    }

    // Lock the cart while the shopper is on Stripe's page.
    const wasInPurchase = cart.status === CART_STATUS.IN_PURCHASE;
    if (wasInPurchase) {
      await paymentService.setCartStatus(cart, CART_STATUS.PAYMENT);
    }

    try {
      const session = await paymentService.createCheckoutSession(cart);

      return res.json({
        error: false,
        message: "Stripe Checkout session created",
        checkoutUrl: session.url,
        checkoutSessionId: session.id,
        amount: (Number(session.amount_total) || 0) / 100,
        currency: String(session.currency || "").toUpperCase(),
        cart: {
          _id: cart._id,
          sessionId: cart.sessionId,
          status: cart.status,
        },
      });
    } catch (err) {
      // Do not leave the shopper locked out if Stripe could not be reached.
      if (wasInPurchase) {
        try {
          await paymentService.setCartStatus(cart, CART_STATUS.IN_PURCHASE);
        } catch (revertErr) {
          console.error("Could not revert cart status:", revertErr.message);
        }
      }

      if (err.isAppError) throw err;

      if (err.type === "StripeAuthenticationError") {
        throw new AppError(
          "Stripe rejected the configured key. Check STRIPE_SECRET_KEY in backend/.env.",
          502
        );
      }

      throw new AppError(
        "Could not start Stripe Checkout. Check the Stripe configuration and try again.",
        502
      );
    }
  })
);

// POST /payment/verify
// Called by the success page. Stripe is the source of truth: the cart is only
// completed when the session reports payment_status === "paid".
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const checkoutSessionId = String(
      req.body?.checkoutSessionId ?? req.query?.session_id ?? ""
    ).trim();

    if (!checkoutSessionId) {
      throw new AppError("A Stripe checkout session id is required.", 400);
    }

    if (!paymentService.isStripeConfigured()) {
      throw new AppError(
        "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env and restart the server.",
        503
      );
    }

    try {
      const session = await paymentService.retrieveCheckoutSession(checkoutSessionId);
      const result = await paymentService.finalizeCheckoutSession(session, req.user._id);

      if (!result.paid) {
        throw new AppError("Stripe has not confirmed this payment yet.", 409, {
          paymentStatus: session.payment_status,
        });
      }

      return res.json({
        error: false,
        message: result.alreadyCompleted
          ? "This payment was already completed. Your exit pass is ready."
          : "Payment confirmed by Stripe. Your exit pass is ready.",
        receipt: paymentService.buildReceipt(session, result, req.user.email),
        gatePass: paymentService.buildGatePass(
          result.transaction,
          req.get("origin") || `${req.protocol}://${req.get("host")}`
        ),
      });
    } catch (err) {
      if (err.isAppError) throw err;

      if (err.type === "StripeInvalidRequestError") {
        throw new AppError("Stripe could not find that checkout session.", 404);
      }

      if (err.type === "StripeAuthenticationError") {
        throw new AppError(
          "Stripe rejected the configured key. Check STRIPE_SECRET_KEY in backend/.env.",
          502
        );
      }

      throw new AppError("Could not verify the payment with Stripe.", 502);
    }
  })
);

// POST /payment/cancel
// The shopper backed out of Stripe Checkout: let them keep shopping.
router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    const cart = await cartRepo.findActiveCartByUser(req.user._id);

    if (!cart) {
      return res.json({ error: false, message: "No active cart session", cart: null });
    }

    if (cart.status === CART_STATUS.PAYMENT) {
      await paymentService.setCartStatus(cart, CART_STATUS.IN_PURCHASE);
    }

    return res.json({
      error: false,
      message: "Stripe Checkout cancelled. Your cart is still active.",
      cart: {
        _id: cart._id,
        sessionId: cart.sessionId,
        status: cart.status,
      },
    });
  })
);

module.exports = router;
