const express = require("express");
const router = express.Router();
const shoppingListService = require("../service/shoppingList.service");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../middleware/AppError");

/**
 * POST /shopping-list/sync-google
 * Sync user's shopping list / checklist from Google Notes / Tasks API.
 */
router.post(
  "/sync-google",
  asyncHandler(async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
      throw new AppError("Google access token is required to sync notes.", 400);
    }

    const result = await shoppingListService.syncFromGoogleNotes(accessToken);

    return res.json({
      error: false,
      message:
        result.count > 0
          ? `Synced ${result.count} item(s) from ${result.source}`
          : "No list items found in your Google Notes or Tasks.",
      ...result,
    });
  })
);

module.exports = router;
