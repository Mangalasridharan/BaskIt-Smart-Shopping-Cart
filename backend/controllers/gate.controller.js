const express = require("express");
const router = express.Router();
const gateService = require("../service/gate.service");
const asyncHandler = require("../middleware/asyncHandler");

const getFrontendBaseUrl = () => {
  return String(
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
};

/* -------------------------------------------------------------------------- */
/* POST /gate/unlock — Unlock pass via API (used by frontend pages & scanners) */
/* -------------------------------------------------------------------------- */
router.post(
  "/unlock",
  asyncHandler(async (req, res) => {
    const code = req.body?.code;
    const gateCode = req.body?.gateCode;
    const gateIdentifier = req.body?.gateNumber || req.body?.gate || 1;

    const result = await gateService.unlockGate({
      code,
      gateCode,
      gateIdentifier,
    });

    return res.json({
      error: false,
      ...result,
    });
  })
);

/* -------------------------------------------------------------------------- */
/* GET /gate/unlock/:code — Direct scanner target / backward compatibility    */
/* If visited via browser, redirect to the frontend React unlock page.        */
/* If visited via API / JSON client, execute unlock and return JSON.          */
/* -------------------------------------------------------------------------- */
router.get(
  "/unlock/:code",
  asyncHandler(async (req, res) => {
    const code = String(req.params.code || "").trim();
    const gateIdentifier = req.query?.gateNumber || req.query?.gate || 1;

    // Check if the client expects an HTML page (e.g. phone camera opening browser)
    const acceptsHtml = req.accepts(["html", "json"]) === "html";

    if (acceptsHtml) {
      const frontendBase = getFrontendBaseUrl();
      return res.redirect(
        `${frontendBase}/gate/unlock/${encodeURIComponent(code)}?gate=${gateIdentifier}`
      );
    }

    // API / JSON client request
    const result = await gateService.unlockGate({
      code,
      gateIdentifier,
    });

    return res.json({
      error: false,
      ...result,
    });
  })
);

/* -------------------------------------------------------------------------- */
/* GET /gate/status/:code — Status poll endpoint                              */
/* -------------------------------------------------------------------------- */
router.get(
  "/status/:code",
  asyncHandler(async (req, res) => {
    const status = await gateService.getGateStatus(req.params.code);
    return res.json({
      error: false,
      ...status,
    });
  })
);

module.exports = router;
