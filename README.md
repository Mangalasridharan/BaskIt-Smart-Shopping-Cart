# 🛒 BaskIt - Autonomous Smart Shopping Cart System

An IoT-integrated autonomous retail checkout system and real-time smart basket application. BaskIt connects physical shopping carts to digital sessions, enabling shoppers to scan items via cart-mounted cameras, track their live bill and basket weight in real time, modify purchases before checkout, and unlock physical exit barriers upon payment verification—bypassing traditional checkout queues entirely.

---

## 🌟 Key Features

- **🌐 Interactive Landing Page**: Modern, responsive landing page showcasing the product vision, step-by-step checkout workflow, IoT hardware architecture, and instant 1-click interactive demo login.
- **🛒 Real-Time Smart Basket**: Live cart telemetry synchronized with database items, dynamic subtotal calculations, weight aggregation, and instant quantity adjustments.
- **⚡ Autonomous Edge Scanning**: Built for integration with ESP32-CAM barcode scanners and load cells for automatic physical item verification.
- **💳 Payment Simulation & Exit Gate Actuation**: Simulates multi-method checkout and triggers Adafruit IO IoT feeds to actuate physical servo barriers upon payment verification.
- **📦 Admin Inventory Dashboard**: Complete product catalog management with barcode lookup, category filtering, stock adjustments, and low-stock alerts.
- **🌓 Dark & Light Modes**: Seamless theme switching with persistent user preferences.

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
# Edit .env with your MongoDB URI and secret
npm run dev
```
Backend runs on `http://localhost:8000`.

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
