# 🛒 BaskIt - Autonomous Smart Shopping Cart System

An IoT-integrated autonomous retail checkout system and real-time smart basket application. BaskIt connects physical shopping carts to digital sessions, enabling shoppers to scan items via cart-mounted cameras, track their live bill and basket weight in real time, modify purchases before checkout, and unlock physical exit barriers upon payment verification—bypassing traditional checkout queues entirely.

---

## 🌟 Key Features

- **🌐 Interactive Landing Page**: Modern, responsive landing page showcasing the product vision, step-by-step checkout workflow, IoT hardware architecture, and instant 1-click interactive demo login.
- **🛒 Real-Time Smart Basket**: Live cart telemetry synchronized with database items, an in-app product barcode scanner with manual entry fallback, dynamic subtotal calculations, weight aggregation, and instant quantity adjustments.
- **🗒️ In-Store Shopping List**: A side-tab to-do drawer for planning the trip, with progress, checkboxes, and completed items. Entries are saved per shopper on the device and tick off automatically when a matching product is scanned into the cart.
- **⚡ Autonomous Edge Scanning**: Built for integration with ESP32-CAM barcode scanners and load cells for automatic physical item verification.
- **💳 Stripe Checkout & Exit Gate Pass**: Sends the shopper to Stripe's hosted payment page, verifies the Checkout Session server-side, and issues a single-use QR exit pass. Scanning the pass pulses Adafruit IO IoT feeds to open a physical servo barrier and close it again only after Stripe reports the session as paid.
- **📦 Admin Inventory Dashboard**: Complete product catalog management with barcode lookup, per-store stock adjustments, and low-stock alerts.
- **🌓 Dark & Light Modes**: Seamless theme switching with persistent user preferences.

---

## 🔐 Authentication & Roles

BaskIt uses email/password authentication with JWT access tokens and two roles:

| Role | Access | Landing page after login |
| --- | --- | --- |
| `customer` | Smart basket, checkout, payment | `/dashboard` |
| `shopkeeper` | Inventory catalogue, stock & pricing | `/inventory` |

Passwords are hashed with bcrypt and never returned by the API. Tokens are sent as
`Authorization: Bearer <token>` and expire after 10 hours. Requests to shopkeeper
endpoints are rejected with `403` for customer accounts.

### Auth API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/customer/register` | Create an account (`fullName`, `email`, `password`, `role`) |
| `POST` | `/customer/login` | Log in with `email` and `password` |
| `GET` | `/customer/me` | Return the signed-in user (requires Bearer token) |

### Demo accounts

The landing page's **Try Demo** buttons create these accounts automatically on first use:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `mangal@gmail.com` | `mangal@123` |
| Shopkeeper | `shopkeeper@baskit.com` | `shopkeeper@123` |

> **Note:** Role selection is open at sign-up for demo purposes. In production, shopkeeper
> accounts should be created by an existing admin rather than self-registered.

---

## 🗄️ Data Model

Product data, store stock, and live cart contents are kept in separate collections:

**`Product`** (`product_catalog`) — shared lookup data, not tied to a shopkeeper:

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Product id used by inventory rows |
| `productName` | String | Display name |
| `productBarcode` | String | Unique barcode / SKU |
| `manufacturer` | String | Brand or manufacturer |
| `price` | Number | Retail price |
| `weight` | Number | Optional unit weight (used by the cart load sensor) |

**`Inventory`** (`shop_inventory`) — one document per shopkeeper, holding their stock:

| Field | Type | Notes |
| --- | --- | --- |
| `shopkeeperId` | ObjectId → `Customer` | Store owner (unique: one inventory per shopkeeper) |
| `storeCode` | String | Unique code encoded in the supermarket's QR sign (e.g. `BASKIT-MART`) |
| `storeName` | String | Display name shown to shoppers after the store QR is scanned |
| `products` | Array | Collection of stocked products |
| `products[].productId` | ObjectId → `Product` | Product being stocked |
| `products[].quantity` | Number | Units available in that store |
| `carts` | Array | Physical smart carts registered to the store |
| `carts[].cartCode` | String | Code encoded in the cart's QR (e.g. `CART-01`) |
| `carts[].status` | String | `Free` \| `In Purchase` \| `Payment` |
| `carts[].sessionId` | String \| null | Active shopping session, if any |
| `carts[].userId` | ObjectId \| null | Shopper currently using the cart |

Example:

```json
{
  "_id": "...",
  "shopkeeperId": "...",
  "storeCode": "BASKIT-MART",
  "storeName": "BaskIt Supermarket",
  "products": [
    { "productId": "...", "quantity": 42 },
    { "productId": "...", "quantity": 8 }
  ],
  "carts": [
    { "cartCode": "CART-01", "status": "Free", "sessionId": null, "userId": null },
    {
      "cartCode": "CART-02",
      "status": "In Purchase",
      "sessionId": "5210f1d5-1f6b-4b35-abe3-5f87e437da71",
      "userId": "..."
    }
  ]
}
```

Scanning is a two-step flow: the shopper first scans the **supermarket** QR (`storeCode`), then the
**cart** QR (`cartCode`). A cart is only grabbed when it exists in that store's `carts` list and is
`Free`; the cart is then locked to the shopper's session. Completing payment releases it back to
`Free`. New stores are seeded with `CART-01`–`CART-05`, and the demo store uses `BASKIT-MART`; both
codes are shown in the shopkeeper's Inventory screen.

**`Cart`** (`carts`) — one document per shopping session:

| Field | Type | Notes |
| --- | --- | --- |
| `sessionId` | String | UUID generated with `randomUUID()` when the cart is scanned |
| `userId` | ObjectId → `Customer` | Customer who owns the session |
| `items` | Array | Embedded cart line items |
| `items[].productName` | String | Display name (also used as the item id in the API) |
| `items[].imageUrl` | String | Optional product image |
| `items[].price` | Number | Unit price |
| `items[].quantity` | Number | Units in the cart |
| `items[].weight` | Number | Total line weight (unit weight × quantity, in grams) |
| `totalPrice` | Number | Sum of `price × quantity` |
| `totalWeight` | Number | Sum of line weights |
| `status` | String | `Free` \| `In Purchase` \| `Payment` |

A cart is created with status `In Purchase` when the shopper scans a cart QR/code. It moves to
`Payment` when checkout starts and back to `Free` (with items cleared) once payment completes,
releasing the physical cart for the next shopper.

Example:

```json
{
  "sessionId": "5210f1d5-1f6b-4b35-abe3-5f87e437da71",
  "userId": "...",
  "items": [
    { "productName": "5 Star Chocolate", "imageUrl": "", "price": 10, "quantity": 2, "weight": 43 }
  ],
  "totalPrice": 20,
  "totalWeight": 43,
  "status": "In Purchase"
}
```

**`Transaction`** (`transactions`) — one document per completed payment:

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Record id; also exposed as the `id` virtual in JSON |
| `sessionId` | String | Cart session that was paid (unique, so history is written once) |
| `cartId` | ObjectId → `Cart` | Cart document the session belongs to |
| `userId` | ObjectId → `Customer` | Shopper who paid |
| `items` | Array | Snapshot of the purchased lines (`productName`, `imageUrl`, `price`, `quantity`, `weight`) |
| `startedAt` | Date | When the shopping session began (the cart's creation time) |
| `completedAt` | Date | When Stripe confirmed the payment |
| `gateCode` | String | Random, single-use token encoded in the exit-gate QR code (unique) |
| `gateStatus` | String | `Locked` until the pass is scanned at the gate, then `Unlocked` |
| `gateUnlockedAt` | Date | When the barrier was opened for this pass |

The record is written once, immediately after Stripe reports `payment_status === "paid"` and
**before** the cart is cleared, so it preserves the items and totals even after the physical cart is
released. The write upserts on `sessionId` and never blocks a shopper whose payment already
succeeded. Carts completed before purchase history existed get a record (and pass) on the next
verification.

### Cart & checkout API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/cart/store/scan` | Scan the supermarket QR (`{ storeCode }`) and select the store |
| `POST` | `/cart/scan` | Grab a cart: requires `{ storeCode, cartCode }`; the cart must be in that store and `Free` |
| `GET` | `/cart/active` | Get the customer's active session, or `null` |
| `POST` | `/cart/payment/initiate` | *(Legacy)* Move the active cart to `Payment`; the dashboard now uses `/payment/checkout-session` |
| `POST` | `/add-product` | Scan an item into the active cart (customer, or shopkeeper Test Scan) |
| `GET` | `/get-all-products` | Live items and cart totals for the current session |
| `DELETE` | `/remove-product/:productName` | Reduce or remove an item from the active cart; requires `{ productBarcode }` that matches the item |
| `POST` | `/process-payment` | *(Legacy)* Complete checkout, unlock the gate, and set the cart back to `Free` |

### Stripe Checkout (hosted payment page)

**Pay Now** does not collect card details in this app. The backend creates a
[Stripe Checkout Session](https://stripe.com/docs/payments/checkout) from the active cart's line
items and returns its URL; the dashboard then redirects the browser to Stripe's hosted page. The
success page verifies the session directly with Stripe before completing the cart.

```text
Pay Now ──▶ POST /payment/checkout-session ──▶ Stripe Checkout (hosted)
                                                      │
                             ┌────────────────────────┴────────────────────────┐
                             ▼                                                 ▼
             /payment/success?session_id=...                     /dashboard?payment=cancelled
                             │                                                 │
                   POST /payment/verify                               POST /payment/cancel
             (Stripe: payment_status === "paid")                 (Payment → In Purchase)
                             │
             cart items cleared, status Free, exit pass issued
                             │
             QR code shown on /payment/success
                             │
       gate scanner opens GET /gate/unlock/<gateCode>
                             │
       Adafruit IO: payment feed ON → hold → OFF
```

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/payment/checkout-session` | Create a Stripe Checkout Session for the active cart and return `checkoutUrl` |
| `POST` | `/payment/verify` | Verify `{ checkoutSessionId }` with Stripe; when paid, complete the cart and return a `gatePass` (QR URL + code) |
| `POST` | `/payment/cancel` | Return a `Payment` cart to `In Purchase` after the shopper leaves Stripe |

All payment routes require a `customer` token.

**Lifecycle:** `In Purchase` → `Payment` when the Checkout Session is created → a `Transaction`
snapshot is written, then the cart becomes `Free` (items cleared) once Stripe reports `paid`.
Verification is idempotent: refreshing the success page returns the same receipt and the same
single-use pass. If the shopper cancels on Stripe, the cart returns to `In Purchase` so they can
keep scanning. Nothing is completed until Stripe confirms payment — the client cannot mark a cart as
paid.

**Configuration (`backend/.env`):**

| Variable | Required | Description |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Secret key from the Stripe Dashboard (`sk_test_…` for test mode) |
| `STRIPE_CURRENCY` | No | Lowercase ISO currency for line items (default `inr`) |
| `STRIPE_MIN_CHARGE` | No | Minimum cart total in major units, checked before Stripe is called (e.g. `50` for ₹50) |
| `FRONTEND_URL` | No | Base URL Stripe returns to (default `http://localhost:5173`) |
| `PUBLIC_BACKEND_URL` | No | Public backend URL encoded in the QR code (e.g. `https://your-service.onrender.com`). Falls back to the request origin |
| `GATE_OPEN_MS` | No | How long the barrier stays open after a pass is scanned, in milliseconds (default `4000`) |

Without `STRIPE_SECRET_KEY`, payment endpoints return `503` and the dashboard shows a configuration
message. An invalid key returns `502` so the frontend does not treat it as an expired login.

**Minimum cart total:** Stripe rejects charges below **US$0.50 equivalent** (per the account's
settlement currency). When paying in INR from a USD-settling account, that is roughly **₹50** — a
₹10 chocolate cannot be paid for on its own. Set `STRIPE_MIN_CHARGE=50` (the `.env.example` value) to
reject small carts with a helpful message before redirecting; Stripe's own too-small error is also
translated into a `409` explaining the minimum. Cart items cheaper than this can still be bought
together with other items.

Test the flow with card `4242 4242 4242 4242`, any future expiry, and any CVC.

### Exit gate pass (QR code)

Paying does **not** open the barrier directly. Once Stripe confirms the session, the response
contains a `gatePass`:

```json
{
  "code": "5f0c…",
  "status": "Locked",
  "unlockedAt": null,
  "url": "http://localhost:8000/gate/unlock/5f0c…"
}
```

`/payment/success` renders `url` as a QR code. The exit scanner opens that URL (or a phone camera
does — no login required), which:

1. checks the code belongs to a paid transaction,
2. writes `ON` to the Adafruit IO `payment` feed,
3. waits `GATE_OPEN_MS`, then writes `OFF` so the barrier closes again,
4. marks the pass `Unlocked` (single use — later scans do not pulse the gate).

The success page polls `GET /gate/status/:code` every 3 seconds, so it switches to **“Gate
unlocked”** as soon as the physical scan happens. As a demo fallback, typing **`completed`** in the
unlock box calls the same Adafruit IO pulse without a QR scan. That word is intentionally public and
must not be used in production.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/gate/unlock/:code` | QR target. Pulses the gate and returns a small HTML page (public) |
| `POST` | `/gate/unlock` | `{ code }` opens the gate; `{ code: "completed", gateCode }` is the demo path and also marks that pass unlocked |
| `GET` | `/gate/status/:code` | `{ gateStatus, unlockedAt }`, polled by the success page (public) |

If Adafruit IO rejects the request (invalid/expired `AIO_KEY`) the unlock returns `502` and the pass
stays `Locked`, so the QR can be scanned again once the key is fixed.

### Removing items without malpractice

Removing an item is a two-factor action: the shopper presses the minus button on the card, then
**re-scans (or types) that product's barcode** in the popup. The server only removes the item when
the barcode resolves to the same product, so a cart can't be emptied without physically handling
each item again. Missing barcodes return `400`, unknown barcodes `404`, and a barcode belonging to
a different product `409` — in every failure case the cart is left untouched.

### Mock supermarkets (manual testing)

Run `npm run seed:stores` in `backend/` once to create these stores, each with five free
carts (`CART-01`–`CART-05`). The codes can be typed on the customer gate instead of scanning
a QR:

| Store QR code | Store name | Cart codes |
| --- | --- | --- |
| `BASKIT-MART` | BaskIt Supermarket | `CART-01` – `CART-05` |
| `FRESH-MART` | FreshMart Grocers | `CART-01` – `CART-05` |
| `DAILY-STORE` | Daily Needs Store | `CART-01` – `CART-05` |
| `CITY-BAZAAR` | City Bazaar | `CART-01` – `CART-05` |

Cart codes are scoped to a store, so `CART-01` can be in use at `FRESH-MART` while remaining
free at `BASKIT-MART`. Seeded mock shopkeeper accounts use the password `shopkeeper@123`.


### Inventory & catalogue API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/products` | Search the shared product catalogue (`?search=`) |
| `GET` | `/products/barcode/:barcode` | Look up one product by barcode |
| `GET` | `/inventory` | List the signed-in shopkeeper's stock |
| `GET` | `/inventory/stats` | Stock totals, valuation and low-stock count for that shopkeeper |
| `POST` | `/inventory` | Add a product to that shopkeeper's stock |
| `PUT` | `/inventory/:productId` | Update product details and/or stock quantity |
| `DELETE` | `/inventory/:productId` | Remove the product from that shopkeeper's stock |
| `POST` | `/inventory/seed` | Add missing sample products to that shopkeeper's stock |

All inventory routes require a `shopkeeper` token. Deleting stock does not delete the shared
product lookup entry, so carts and other stores keep a valid product reference.

---

## 🏗️ Architecture & Technology Stack

```
   [ Customer Smart Cart ]
             │ (Barcode Scanning & Weight Sensing)
             ▼
      [ ESP32-CAM / IoT ] ────(MQTT / REST)────┐
             │                                 │
             ▼                                 ▼
   [ React Frontend (Vite) ] ──(HTTP/REST)──▶ [ Express Backend (Node.js) ]
             │                                 │
             ▼                                 ▼
       [ Vercel CDN ]                   [ MongoDB Atlas ]
                                               │
                                               ▼
                                      [ Adafruit IO Relay ]
                                               │
                                               ▼
                                      [ Physical Exit Gate ]
```

- **Frontend**: React 19, Vite, Tailwind CSS, React Router v7, React Icons, Axios
- **Backend**: Node.js, Express 4, Mongoose 8, JWT Authentication, bcryptjs, CORS
- **Payments**: Stripe Checkout (hosted)
- **Database**: MongoDB Atlas
- **IoT & Telemetry**: Adafruit IO (MQTT/REST Feeds)
- **Deployment**: Vercel (Frontend SPA) + Render (Backend Web Service)

---

## 🚀 Deployment Guide

### 1. Backend Deployment (Render)

1. Sign up / log in to [Render](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`BaskIt-Smart-Shopping-Cart`).
4. Configure the service settings:
   - **Name**: `baskit-backend`
   - **Region**: Closest to your users (e.g., Singapore / Oregon / Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: `Free`
5. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `ACCESS_TOKEN_SECRET`: A secure random secret string (e.g. `baskit_production_secret_key`)
   - `NODE_ENV`: `production`
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (`sk_live_…` or `sk_test_…`)
   - `FRONTEND_URL`: Your deployed frontend origin (e.g. `https://baskit.vercel.app`)
   - `PUBLIC_BACKEND_URL`: This Render service URL so the exit QR works from a phone (e.g. `https://baskit-backend.onrender.com`)
   - *(Optional)* `STRIPE_CURRENCY`: Lowercase ISO currency for Checkout (default `inr`)
   - *(Optional)* `GATE_OPEN_MS`: Milliseconds the barrier stays open (default `4000`)
   - *(Optional)* `AIO_USERNAME`: Your Adafruit IO username
   - *(Optional)* `AIO_KEY`: Your Adafruit IO active key
6. Click **Deploy Web Service**.
7. Note down your backend URL (e.g. `https://baskit-backend.onrender.com`).

> **Tip**: You can also use the included `render.yaml` blueprint for 1-click configuration on Render.

---

### 2. Frontend Deployment (Vercel)

1. Sign up / log in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`BaskIt-Smart-Shopping-Cart`).
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL without trailing slash (e.g., `https://baskit-backend.onrender.com`)
6. Click **Deploy**.
7. Your app will be live at `https://<your-project>.vercel.app/` with the Landing Page loading instantly at `/`.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB connection (local or MongoDB Atlas)

### 1. Clone Repository
```bash
git clone https://github.com/Mangalasridharan/BaskIt-Smart-Shopping-Cart.git
cd BaskIt-Smart-Shopping-Cart
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, secret, and STRIPE_SECRET_KEY
npm run dev
```
Backend runs on `http://localhost:8000`. Payment endpoints stay disabled (`503`) until
`STRIPE_SECRET_KEY` is set.

### 3. Configure Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Default points to http://localhost:8000
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 📄 License

This project is licensed under the ISC License.
