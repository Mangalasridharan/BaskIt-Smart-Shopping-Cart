const axios = require("axios");

/**
 * Adafruit IO Integration Service for BaskIt Smart Exit Gates.
 *
 * Automatically provisions a dedicated dashboard named after the store
 * (e.g. "FreshMart Hypermarket") containing toggle buttons for all store exit gates
 * (gate-1, gate-2, ..., gate-N) initialized in the closed (OFF) state.
 */

const getCredentials = () => {
  const username = (process.env.AIO_USERNAME || "").trim();
  const key = (process.env.AIO_KEY || "").trim();
  return { username, key, isConfigured: Boolean(username && key) };
};

const getAioClient = () => {
  const { username, key, isConfigured } = getCredentials();
  if (!isConfigured) return null;

  return axios.create({
    baseURL: `https://io.adafruit.com/api/v2/${username}`,
    headers: {
      "X-AIO-Key": key,
      "Content-Type": "application/json",
    },
    timeout: 8000,
  });
};

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "store-gates";

/**
 * Ensures the store dashboard exists (e.g. "FreshMart Hypermarket").
 */
const ensureDashboard = async (client, storeName = "Supermarket") => {
  const cleanName = String(storeName || "Supermarket").trim();
  const dashKey = slugify(cleanName);

  try {
    const res = await client.get(`/dashboards/${dashKey}`);
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        const all = await client.get("/dashboards");
        const match = (all.data || []).find(
          (d) =>
            d.key === dashKey ||
            (d.name && d.name.trim().toLowerCase() === cleanName.toLowerCase())
        );
        if (match) {
          const fetched = await client.get(`/dashboards/${match.key}`);
          return fetched.data;
        }
      } catch (listErr) {
        console.warn("Could not list existing dashboards:", listErr.message);
      }

      const createRes = await client.post("/dashboards", {
        dashboard: {
          name: cleanName,
          key: dashKey,
          description: `Smart Shopping Cart Exit Gates for ${cleanName}`,
        },
      });
      console.log(`✅ Created Adafruit IO dashboard: "${cleanName}" (key: ${dashKey})`);
      return createRes.data;
    }
    throw err;
  }
};

/**
 * Ensures a gate feed (e.g., gate-1) exists.
 */
const ensureFeed = async (client, feedKey, feedName) => {
  try {
    const res = await client.get(`/feeds/${feedKey}`);
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const createRes = await client.post("/feeds", {
        feed: {
          name: feedName,
          key: feedKey,
          description: `BaskIt Automated Exit Gate Barrier (${feedName})`,
        },
      });
      console.log(`✅ Created Adafruit IO feed: ${feedName} (${feedKey})`);
      return createRes.data;
    }
    throw err;
  }
};

/**
 * Ensures a toggle button block exists inside the dashboard for the given feed.
 */
const ensureDashboardBlock = async (client, dashboard, feed, gateIndex) => {
  const existingBlocks = dashboard.blocks || [];
  const hasBlock = existingBlocks.some((b) =>
    (b.block_feeds || []).some(
      (bf) => bf.feed && (bf.feed.id === feed.id || bf.feed.key === feed.key)
    )
  );

  if (hasBlock) {
    return null;
  }

  try {
    const blockRes = await client.post(`/dashboards/${dashboard.key}/blocks`, {
      block: {
        name: `Exit Gate #${gateIndex}`,
        visual_type: "toggle_button",
        block_feeds: [
          {
            feed_id: feed.id,
          },
        ],
        properties: {
          onText: "OPEN (ON)",
          offText: "CLOSED (OFF)",
          onValue: "ON",
          offValue: "OFF",
          onColor: "#10b981",
          offColor: "#ef4444",
        },
        size_x: 4,
        size_y: 2,
      },
    });
    console.log(`✅ Created toggle button block for Gate #${gateIndex} in dashboard "${dashboard.name}"`);
    return blockRes.data;
  } catch (err) {
    console.warn(`⚠️ Could not add block for Gate #${gateIndex}:`, err.message);
    return null;
  }
};

/**
 * Initialize all gates for a store:
 * 1. Creates/ensures dashboard named after storeName
 * 2. Creates feeds gate-1, gate-2, ... gate-N
 * 3. Sets each feed to "OFF" (closed state)
 * 4. Places toggle button blocks for every gate inside this store dashboard
 */
const initStoreGates = async (storeNameOrOptions = "Supermarket", maybeNumberOfGates = null) => {
  let storeName = "Supermarket";
  let numberOfGates = 1;

  if (typeof storeNameOrOptions === "object" && storeNameOrOptions !== null) {
    storeName = storeNameOrOptions.storeName || storeNameOrOptions.name || "Supermarket";
    numberOfGates = storeNameOrOptions.numberOfGates ?? 1;
  } else if (typeof storeNameOrOptions === "number") {
    numberOfGates = storeNameOrOptions;
  } else if (typeof storeNameOrOptions === "string") {
    storeName = storeNameOrOptions;
    if (maybeNumberOfGates !== null) {
      numberOfGates = maybeNumberOfGates;
    }
  }

  const client = getAioClient();
  if (!client) {
    console.warn("⚠️ Adafruit IO credentials not configured. Skipping gate initialization.");
    return { success: false, reason: "not_configured" };
  }

  const count = Math.max(1, parseInt(numberOfGates, 10) || 1);
  const cleanStoreName = String(storeName).trim() || "Supermarket";
  console.log(`🚀 Provisioning dashboard "${cleanStoreName}" with ${count} exit gate button(s) on Adafruit IO...`);

  try {
    const dashboard = await ensureDashboard(client, cleanStoreName);
    let freshDashboard = dashboard;
    try {
      const refreshed = await client.get(`/dashboards/${dashboard.key}`);
      freshDashboard = refreshed.data;
    } catch {
      // keep existing
    }

    const gateResults = [];

    for (let i = 1; i <= count; i++) {
      const feedKey = `gate-${i}`;
      const feedName = `Gate ${i}`;

      // 1. Ensure feed exists
      const feed = await ensureFeed(client, feedKey, feedName);

      // 2. Set to initial "OFF" state (closed state)
      try {
        await client.post(`/feeds/${feed.key}/data`, { value: "OFF" });
        console.log(`🔒 Initialized ${feedName} (${feedKey}) -> OFF (Closed state)`);
      } catch (dataErr) {
        console.warn(`⚠️ Warning setting initial OFF state for ${feedKey}:`, dataErr.message);
      }

      // 3. Ensure toggle button block inside this store dashboard
      await ensureDashboardBlock(client, freshDashboard, feed, i);

      gateResults.push({
        gateNumber: i,
        feedKey,
        feedName,
        feedId: feed.id,
        initialState: "OFF",
      });
    }

    console.log(`✅ Successfully provisioned ${count} gate button(s) inside dashboard "${cleanStoreName}" in OFF state.`);
    return {
      success: true,
      storeName: cleanStoreName,
      count,
      gates: gateResults,
      dashboard: freshDashboard.key,
      dashboardName: freshDashboard.name,
    };
  } catch (err) {
    console.error(`❌ Adafruit IO gate initialization error for "${cleanStoreName}":`, err.response?.data || err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Set the state of a gate: "ON" (Open) or "OFF" (Closed)
 */
const setGateState = async (gateIdentifier = 1, value = "OFF", label = "") => {
  const client = getAioClient();
  if (!client) {
    console.warn("⚠️ Adafruit IO credentials not configured.");
    return false;
  }

  let feedKey = "gate-1";
  if (typeof gateIdentifier === "number") {
    feedKey = `gate-${Math.max(1, gateIdentifier)}`;
  } else if (typeof gateIdentifier === "string" && gateIdentifier.trim()) {
    const cleaned = gateIdentifier.trim().toLowerCase();
    if (cleaned.startsWith("gate-")) {
      feedKey = cleaned;
    } else if (!isNaN(cleaned)) {
      feedKey = `gate-${Math.max(1, parseInt(cleaned, 10))}`;
    } else {
      feedKey = cleaned;
    }
  }

  try {
    await client.post(`/feeds/${feedKey}/data`, { value: String(value).toUpperCase() });
    console.log(`✅ Exit Gate [${feedKey}] set to ${value.toUpperCase()} ${label}`);
    return true;
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        const feedName = feedKey.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
        await ensureFeed(client, feedKey, feedName);
        await client.post(`/feeds/${feedKey}/data`, { value: String(value).toUpperCase() });
        console.log(`✅ Created and set [${feedKey}] to ${value.toUpperCase()} ${label}`);
        return true;
      } catch (retryErr) {
        console.warn(`⚠️ Retry setting gate ${feedKey} failed:`, retryErr.message);
      }
    }
    console.warn(`⚠️ Adafruit IO gate [${feedKey}] warning:`, err.message);
    return false;
  }
};

/**
 * Pulse a gate barrier:
 * 1. Sets the gate feed to "ON" (Barrier opens / button turns ON)
 * 2. Waits holdMs (default 4000ms from GATE_OPEN_MS)
 * 3. Sets the gate feed back to "OFF" (Barrier closes / button turns OFF)
 */
const pulseGate = async (gateIdentifier = 1, label = "", holdMs = null) => {
  const effectiveHoldMs =
    holdMs !== null
      ? holdMs
      : Math.max(0, Number(process.env.GATE_OPEN_MS ?? 4000) || 0);

  const opened = await setGateState(gateIdentifier, "ON", label);
  if (!opened) {
    return { opened: false, closed: false, gateIdentifier };
  }

  if (effectiveHoldMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, effectiveHoldMs));
  }

  const closed = await setGateState(gateIdentifier, "OFF", label);
  return { opened, closed, gateIdentifier };
};

module.exports = {
  getCredentials,
  initStoreGates,
  setGateState,
  pulseGate,
};
