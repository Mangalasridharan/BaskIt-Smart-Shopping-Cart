const Transaction = require("../models/transaction.model");
const { pulseExitGate } = require("./payment.service");
const AppError = require("../middleware/AppError");

const DEMO_CODE = "completed";
const normalize = (value) => String(value ?? "").trim();

/**
 * Unlock a pass. Single-use: once unlocked, later scans do not pulse the gate
 * again. Returns the current pass state so callers can report what happened.
 */
const unlockPass = async (transaction, gateIdentifier = 1) => {
  if (transaction.gateStatus === "Unlocked") {
    return { unlocked: true, alreadyUnlocked: true, gate: { opened: true, closed: true } };
  }

  const gate = await pulseExitGate(`(pass ${transaction.gateCode})`, gateIdentifier);

  if (!gate.opened) {
    return { unlocked: false, alreadyUnlocked: false, gate };
  }

  transaction.gateStatus = "Unlocked";
  transaction.gateUnlockedAt = new Date();
  await transaction.save();

  return { unlocked: true, alreadyUnlocked: false, gate };
};

/**
 * Process gate unlock request (supports token, gateCode, and demo bypass).
 */
const unlockGate = async ({ code, gateCode, gateIdentifier = 1 }) => {
  const token = normalize(code || gateCode);

  if (!token) {
    throw new AppError("A gate code is required.", 400);
  }

  // Demo path: type "completed" instead of scanning the QR.
  if (token.toLowerCase() === DEMO_CODE) {
    const gate = await pulseExitGate("(demo code)", gateIdentifier);

    if (!gate.opened) {
      throw new AppError("Could not reach the exit gate. Check the Adafruit connection and try again.", 502);
    }

    let transaction = null;
    const directCode = normalize(gateCode);
    if (directCode) {
      transaction = await Transaction.findOne({ gateCode: directCode });
      if (transaction) {
        transaction.gateStatus = "Unlocked";
        transaction.gateUnlockedAt = new Date();
        await transaction.save();
      }
    }

    return {
      unlocked: true,
      demo: true,
      gateClosed: gate.closed,
      gateStatus: "Unlocked",
      unlockedAt: transaction?.gateUnlockedAt || new Date(),
    };
  }

  const transaction = await Transaction.findOne({ gateCode: token });

  if (!transaction) {
    throw new AppError("This gate pass is not valid.", 404);
  }

  const result = await unlockPass(transaction, gateIdentifier);

  if (!result.unlocked) {
    throw new AppError("Could not reach the exit gate. Check the Adafruit connection and try again.", 502);
  }

  return {
    unlocked: result.unlocked,
    alreadyUnlocked: result.alreadyUnlocked,
    gateStatus: transaction.gateStatus,
    unlockedAt: transaction.gateUnlockedAt,
    gateClosed: result.gate.closed,
    demo: false,
    storeName: transaction.storeName || "BaskIt Supermarket",
    cartCode: transaction.cartCode || "CART",
  };
};

/**
 * Query the status of a gate pass.
 */
const getGateStatus = async (rawCode) => {
  const code = normalize(rawCode);

  if (!code) {
    throw new AppError("A gate code is required.", 400);
  }

  const transaction = await Transaction.findOne(
    { gateCode: code },
    { gateStatus: 1, gateUnlockedAt: 1, storeName: 1, cartCode: 1 }
  );

  if (!transaction) {
    throw new AppError("This gate pass is not valid.", 404);
  }

  const isClosed = Boolean(
    transaction.gateStatus === "Unlocked" &&
      transaction.gateUnlockedAt &&
      Date.now() - new Date(transaction.gateUnlockedAt).getTime() >= 3500
  );

  return {
    gateStatus: transaction.gateStatus,
    unlockedAt: transaction.gateUnlockedAt,
    gateClosed: isClosed,
    storeName: transaction.storeName || "BaskIt Supermarket",
    cartCode: transaction.cartCode || "CART",
  };
};

module.exports = {
  unlockGate,
  getGateStatus,
  unlockPass,
};
