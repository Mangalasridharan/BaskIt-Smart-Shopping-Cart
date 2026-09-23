import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Navbar from "../../components/Navbar/Navbar";
import ShoppingCards from "../../components/Cards/ShoppingCards";
import QrScanner, {
  PRODUCT_BARCODE_FORMATS,
} from "../../components/QrScanner";
import ShoppingList, {
  SHOPPING_LIST_SCAN_EVENT,
} from "../../components/ShoppingList/ShoppingList";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import {
  HiOutlineQrcode,
  HiOutlineShoppingCart,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineCamera,
  HiOutlineRefresh,
  HiOutlineStatusOnline,
  HiOutlineShieldCheck,
} from "react-icons/hi";

const formatWeight = (grams) => {
  const value = Number(grams) || 0;
  return value >= 1000 ? `${(value / 1000).toFixed(2)} kg` : `${value} g`;
};

const STORE_SESSION_KEY = "baskit.store";

// Seeded with `npm run seed:stores` in the backend.
const MOCK_STORES = [
  { code: "BASKIT-MART", name: "BaskIt Supermarket" },
  { code: "FRESH-MART", name: "FreshMart Grocers" },
  { code: "DAILY-STORE", name: "Daily Needs Store" },
  { code: "CITY-BAZAAR", name: "City Bazaar" },
];

/* -------------------------------------------------------------------------- */
/* Customer dashboard                                                          */
/* -------------------------------------------------------------------------- */
const Home = () => {
  const { user: userInfo } = useAuth();

  const [cart, setCart] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

  const [store, setStore] = useState(null);
  const [manualStoreCode, setManualStoreCode] = useState("");
  const [storeScanModalOpen, setStoreScanModalOpen] = useState(false);
  const [storeError, setStoreError] = useState(null);
  const [isScanningStore, setIsScanningStore] = useState(false);

  const [manualCode, setManualCode] = useState("");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [error, setError] = useState(null);

  const [productScanOpen, setProductScanOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [productScanError, setProductScanError] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Removal is gated behind re-scanning the product's barcode.
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeBarcode, setRemoveBarcode] = useState("");
  const [removeError, setRemoveError] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const manualInputRef = useRef(null);
  const storeInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const sessionId = cart?.sessionId || null;

  /* ----------------------------- session helpers ---------------------------- */

  const checkActiveSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
      const response = await axiosInstance.get("/cart/active");
      setCart(response.data.cart || null);
    } catch (err) {
      console.error("Error checking cart session:", err);
      setCart(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  // Step 1: scan the supermarket QR to select the store.
  const beginStoreSession = useCallback(async (code) => {
    const value = String(code || "").trim().toUpperCase();
    if (!value) {
      setStoreError("Enter the supermarket code printed under its QR.");
      return;
    }

    setIsScanningStore(true);
    setStoreError(null);

    try {
      const response = await axiosInstance.post("/store/scan", {
        storeName: value,
      });

      setStore(response.data.store || null);
      try {
        sessionStorage.setItem(STORE_SESSION_KEY, JSON.stringify(response.data.store));
      } catch {
        /* storage can be unavailable */
      }
      setManualStoreCode("");
      setStoreScanModalOpen(false);
    } catch (err) {
      console.error("Error scanning store:", err);
      setStoreError(
        err.response?.data?.message || "Could not find that store. Please try again."
      );
      setStoreScanModalOpen(false);
    } finally {
      setIsScanningStore(false);
    }
  }, []);

  const handleStoreScanDetected = useCallback(
    (code) => {
      beginStoreSession(code);
    },
    [beginStoreSession]
  );

  const handleManualStoreSubmit = (e) => {
    e.preventDefault();
    beginStoreSession(manualStoreCode);
  };

  const changeStore = () => {
    setStore(null);
    setStoreError(null);
    try {
      sessionStorage.removeItem(STORE_SESSION_KEY);
    } catch {
      /* storage can be unavailable */
    }
  };

  // Step 2: scan a cart that belongs to the selected store.
  const beginSession = useCallback(
    async (cartCode) => {
      const code = String(cartCode || "").trim();
      if (!store) {
        setGateError("Scan or select the supermarket first.");
        return;
      }

      if (!code) {
        setGateError("Enter the cart code shown on your cart.");
        return;
      }

      setIsStartingSession(true);
      setGateError(null);

      try {
        const response = await axiosInstance.post("/cart/scan", {
          cartCode: code,
          storeName: store.storeName,
          storeId: store.storeId || store._id,
          storeCode: store.storeCode,
        });
        setCart(response.data.cart || null);
        setManualCode("");
        setScanModalOpen(false);
      } catch (err) {
        console.error("Error starting cart session:", err);
        setGateError(
          err.response?.data?.message || "Could not start a cart session. Please try again."
        );
        // Surface the error on the gate rather than behind the scanner overlay.
        setScanModalOpen(false);
      } finally {
        setIsStartingSession(false);
      }
    },
    [store]
  );

  const handleScanDetected = useCallback(
    (code) => {
      beginSession(code);
    },
    [beginSession]
  );

  const handleManualSubmit = (e) => {
    e.preventDefault();
    beginSession(manualCode);
  };

  useEffect(() => {
    // Restore the selected store if the shopper refreshed before grabbing a cart.
    try {
      const raw = sessionStorage.getItem(STORE_SESSION_KEY);
      if (raw) setStore(JSON.parse(raw));
    } catch {
      /* storage can be unavailable */
    }
    checkActiveSession();
  }, [checkActiveSession]);

  // The shopper came back from Stripe without paying: unlock the cart again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "cancelled") return;

    let cancelled = false;

    const resumeCart = async () => {
      try {
        const response = await axiosInstance.post("/payment/cancel");
        if (!cancelled) {
          setPaymentNotice(
            "Stripe Checkout was cancelled. Your cart is still active — you can pay whenever you're ready."
          );
        }
        if (!cancelled && response.data?.cart?.status) {
          setCart((current) =>
            current ? { ...current, status: response.data.cart.status } : current
          );
        }
      } catch (err) {
        console.error("Error resuming cart after cancelled payment:", err);
      } finally {
        window.history.replaceState({}, "", "/dashboard");
      }
    };

    resumeCart();

    return () => {
      cancelled = true;
    };
  }, []);


  /* ------------------------ live cart items (polling) ----------------------- */

  const getAllProducts = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/get-all-products");
      const data = response.data;

      if (data && Array.isArray(data.products)) {
        setAllProducts(data.products);
      }

      // The server is the source of truth for session status.
      if (data && Object.prototype.hasOwnProperty.call(data, "cart")) {
        setCart(data.cart || null);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Unable to fetch cart items. Retrying…");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setAllProducts([]);
      return undefined;
    }

    setIsLoading(true);
    setError(null);
    getAllProducts();

    const interval = setInterval(getAllProducts, 2000);
    return () => clearInterval(interval);
  }, [sessionId, getAllProducts]);

  /* --------------------------- barcode-gated removal ----------------------- */

  const openRemoveProduct = (item) => {
    setRemoveTarget(item);
    setRemoveBarcode("");
    setRemoveError(null);
  };

  const confirmRemoveProduct = useCallback(
    async (rawBarcode) => {
      if (!removeTarget) return;

      const barcode = String(rawBarcode || "").trim();
      if (!barcode) {
        setRemoveError("Scan or enter the product barcode to remove it.");
        return;
      }

      setIsRemoving(true);
      setRemoveError(null);

      try {
        await axiosInstance.delete(
          `/remove-product/${encodeURIComponent(
            removeTarget.product_name || removeTarget._id
          )}`,
          { data: { productBarcode: barcode } }
        );
        await getAllProducts();
        setRemoveTarget(null);
        setRemoveBarcode("");
      } catch (err) {
        console.error("Remove error:", err.response?.data || err.message);
        setRemoveError(
          err.response?.data?.message ||
            "Could not verify that barcode. The product was not removed."
        );
      } finally {
        setIsRemoving(false);
      }
    },
    [removeTarget, getAllProducts]
  );

  const handleRemoveScanDetected = useCallback(
    (code) => {
      confirmRemoveProduct(code);
    },
    [confirmRemoveProduct]
  );

  const handleManualRemoveSubmit = (e) => {
    e.preventDefault();
    confirmRemoveProduct(removeBarcode);
  };

  /* ---------------------------- product scanning --------------------------- */

  const openProductScan = () => {
    setProductScanError(null);
    setManualBarcode("");
    setProductScanOpen(true);
  };

  const addProductByBarcode = useCallback(
    async (rawBarcode) => {
      const barcode = String(rawBarcode || "").trim();

      if (!barcode) {
        setProductScanError("Enter the barcode printed on the product.");
        return;
      }

      setIsAddingProduct(true);
      setProductScanError(null);

      try {
        const response = await axiosInstance.post("/add-product", {
          productBarcode: barcode,
          quantity: 1,
        });

        // Let the shopping list tick off a matching to-do item.
        const productName = response.data?.product?.product_name;
        if (productName) {
          window.dispatchEvent(
            new CustomEvent(SHOPPING_LIST_SCAN_EVENT, {
              detail: { productName },
            })
          );
        }

        await getAllProducts();
        setProductScanOpen(false);
        setManualBarcode("");
      } catch (err) {
        console.error("Error adding product:", err);
        setProductScanError(
          err.response?.data?.message || "Could not add that product. Please try again."
        );
      } finally {
        setIsAddingProduct(false);
      }
    },
    [getAllProducts]
  );

  const handleProductScanDetected = useCallback(
    (code) => {
      addProductByBarcode(code);
    },
    [addProductByBarcode]
  );

  const handleManualBarcodeSubmit = (e) => {
    e.preventDefault();
    addProductByBarcode(manualBarcode);
  };

  const handleOpenPayment = async () => {
    if (!allProducts.length || isRedirectingToCheckout) return;

    setIsRedirectingToCheckout(true);
    setError(null);
    setPaymentNotice(null);

    try {
      const response = await axiosInstance.post("/payment/checkout-session");
      const checkoutUrl = response.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Stripe did not return a checkout URL");
      }

      // Hand the shopper over to Stripe's hosted payment page.
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error("Error starting Stripe Checkout:", err);
      setError(
        err.response?.data?.message ||
          "Could not open Stripe Checkout. Please try again."
      );
      setIsRedirectingToCheckout(false);
    }
  };

  const grandTotal = useMemo(() => {
    if (cart) return Number(cart.totalPrice) || 0;
    return allProducts.reduce(
      (total, product) => total + Number(product.Price) * Number(product.Quantity),
      0
    );
  }, [cart, allProducts]);

  const totalWeightLabel = useMemo(() => {
    if (cart) return formatWeight(cart.totalWeight);
    return formatWeight(
      allProducts.reduce((total, product) => total + (Number(product.weight) || 0), 0)
    );
  }, [cart, allProducts]);

  /* --------------------------------- render -------------------------------- */

  if (isCheckingSession) {
    return (
      <div className="grid-bg flex min-h-screen items-center justify-center bg-cream-100 dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3 text-ink/60 dark:text-slate-400">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent dark:border-citrus-400 dark:border-t-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-citrus-400">
            Checking your cart…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-36 font-sans text-ink transition-colors duration-300 dark:bg-[#090D16] dark:text-slate-100">
      <Navbar userInfo={userInfo} />

      <ShoppingList />

      <div className="mt-10 w-full px-6 sm:px-8 lg:px-10">
        {!cart ? (
          /* --------------------------- Grab a cart gate -------------------------- */
          <div className="flex justify-center items-start pt-2">
            <div className="w-full max-w-md overflow-hidden rounded-4xl border border-cream-300/90 bg-cream-50 shadow-lift animate-fade-in-up dark:border-white/[0.08] dark:bg-[#0F172A]">
              {/* Ink header with step indicator */}
              <div className="border-b border-slate-800 bg-slate-900 px-7 py-6 text-white dark:bg-[#090D16]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Session start
                  </span>
                  <span className="rounded-full border border-citrus-400/30 bg-citrus-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-citrus-300">
                    Step {store ? 2 : 1} of 2
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {[
                    { step: 1, label: "Store", done: Boolean(store), active: !store },
                    { step: 2, label: "Cart", done: false, active: Boolean(store) },
                  ].map(({ step, label, done, active }, index) => (
                    <React.Fragment key={step}>
                      {index > 0 && (
                        <span
                          className={`h-px flex-1 ${
                            store ? "bg-citrus-400/50" : "bg-white/15"
                          }`}
                        />
                      )}
                      <span
                        className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                          done || active ? "text-citrus-300" : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${
                            done
                              ? "bg-citrus-400 text-slate-950 font-bold"
                              : active
                              ? "border border-citrus-400/50 text-citrus-300"
                              : "border border-white/15 text-slate-500"
                          }`}
                        >
                          {done ? "✓" : step}
                        </span>
                        {label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="p-7">
                {!store ? (
                  /* ------------------------- Step 1: store QR ------------------------- */
                  <>
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-citrus-400 text-2xl text-white shadow-citrus">
                        <HiOutlineQrcode />
                      </div>
                      <h2 className="mt-4 font-display text-2xl font-bold">
                        Scan the store
                      </h2>
                      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink/50 dark:text-slate-400">
                        Scan the QR at the supermarket entrance so we know which
                        store&rsquo;s carts and catalogue you&rsquo;re shopping in.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStoreError(null);
                        setStoreScanModalOpen(true);
                      }}
                      disabled={isScanningStore}
                      className="btn-primary mt-7 w-full py-3.5 shadow-indigo"
                    >
                      <HiOutlineQrcode className="text-lg" />
                      Scan store QR code
                    </button>

                    <div className="my-6 flex items-center gap-3">
                      <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35 dark:text-cream-100/35">
                        or enter store code / store name
                      </span>
                      <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                    </div>

                    <form onSubmit={handleManualStoreSubmit} className="space-y-3">
                      <input
                        ref={storeInputRef}
                        type="text"
                        value={manualStoreCode}
                        onChange={(e) => {
                          setManualStoreCode(e.target.value);
                          setStoreError(null);
                        }}
                        placeholder="Enter supermarket name (e.g. FreshMart Hypermarket)"
                        autoComplete="off"
                        className="field"
                      />
                      <button
                        type="submit"
                        disabled={isScanningStore || !manualStoreCode.trim()}
                        className="btn-lime w-full py-3"
                      >
                        {isScanningStore ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                            Finding store…
                          </>
                        ) : (
                          <>
                            Submit store name
                            <HiOutlineArrowRight />
                          </>
                        )}
                      </button>
                    </form>

                    {storeError && (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                        <HiOutlineExclamationCircle className="shrink-0 text-base" />
                        <span>{storeError}</span>
                      </div>
                    )}

                    <div className="mt-5">
                      <span className="mb-2 block text-center text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35 dark:text-cream-100/35">
                        Sample supermarkets
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {MOCK_STORES.map((mockStore) => (
                          <button
                            key={mockStore.code}
                            type="button"
                            title={mockStore.name}
                            onClick={() => {
                              setManualStoreCode(mockStore.name);
                              setStoreError(null);
                            }}
                            className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                              manualStoreCode === mockStore.name
                                ? "border-ink bg-ink text-citrus-400 dark:border-citrus-400 dark:bg-citrus-400 dark:text-ink"
                                : "border-cream-300 bg-cream-100 text-ink/60 hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:text-cream-100/60"
                            }`}
                          >
                            {mockStore.name}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-ink/35 dark:text-cream-100/35">
                        Tap a store, then press Submit store name.
                      </p>
                    </div>

                    <p className="mt-4 text-center text-[10px] text-ink/35 dark:text-cream-100/35">
                      The store code is printed under the QR at the entrance.
                    </p>
                  </>
                ) : (
                  /* -------------------------- Step 2: cart QR ------------------------- */
                  <>
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-2xl text-white shadow-indigo">
                        <HiOutlineShoppingCart />
                      </div>
                      <h2 className="mt-4 font-display text-2xl font-bold">
                        Grab a cart
                      </h2>
                      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink/50 dark:text-cream-100/50">
                        Now scan the QR on the cart. Only carts belonging to this
                        store and currently free can be grabbed.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-cream-300 bg-cream-100/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <HiOutlineStatusOnline className="shrink-0 text-lg text-brand-600 dark:text-citrus-400" />
                        <div className="min-w-0 leading-tight">
                          <span className="micro block">Selected store</span>
                          <span className="block truncate text-xs font-semibold">
                            {store.storeName}
                          </span>
                          <span className="block font-mono text-[10px] text-ink/40 dark:text-cream-100/40">
                            {store.freeCarts}/{store.totalCarts} carts free
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={changeStore}
                        className="shrink-0 rounded-full border border-cream-300 bg-cream-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink/60 transition-colors hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:text-cream-100/60"
                      >
                        Change
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGateError(null);
                        setScanModalOpen(true);
                      }}
                      disabled={isStartingSession}
                      className="btn-primary mt-4 w-full py-3.5"
                    >
                      <HiOutlineQrcode className="text-lg" />
                      Scan cart QR code
                    </button>

                    <div className="my-6 flex items-center gap-3">
                      <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35 dark:text-cream-100/35">
                        or enter code
                      </span>
                      <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                    </div>

                    <form onSubmit={handleManualSubmit} className="space-y-3">
                      <input
                        ref={manualInputRef}
                        type="text"
                        value={manualCode}
                        onChange={(e) => {
                          setManualCode(e.target.value);
                          setGateError(null);
                        }}
                        placeholder="Enter cart code manually"
                        autoComplete="off"
                        className="field"
                      />
                      <button
                        type="submit"
                        disabled={isStartingSession || !manualCode.trim()}
                        className="btn-lime w-full py-3"
                      >
                        {isStartingSession ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                            Starting…
                          </>
                        ) : (
                          <>
                            Submit code
                            <HiOutlineArrowRight />
                          </>
                        )}
                      </button>
                    </form>

                    {gateError && (
                      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                        <HiOutlineExclamationCircle className="shrink-0 text-base" />
                        <span>{gateError}</span>
                      </div>
                    )}

                    <p className="mt-5 text-center text-[10px] leading-relaxed text-ink/35 dark:text-cream-100/35">
                      The cart code is printed under the QR on the cart screen.
                      <br />
                      Demo carts:{" "}
                      <span className="font-mono font-semibold">CART-01</span> –{" "}
                      <span className="font-mono font-semibold">CART-05</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ----------------------------- Active dashboard ------------------------ */
          <>
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="eyebrow">
                  <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-brand-500" />
                  Live session
                </span>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Your smart basket
                </h1>
                <p className="mt-1.5 max-w-lg text-sm text-ink/50 dark:text-cream-100/50">
                  Real-time telemetry of the items inside your physical shopping cart.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-8 sm:mt-18">
                <button
                  type="button"
                  onClick={openProductScan}
                  className="btn-lime px-5 py-3 text-xs uppercase tracking-[0.12em]"
                >
                  <HiOutlineCamera className="text-base" />
                  Add product
                </button>
              </div>
            </div>

            {paymentNotice && (
              <div className="mb-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                <HiOutlineExclamationCircle className="shrink-0 text-base" />
                <span>{paymentNotice}</span>
                <button
                  type="button"
                  onClick={() => setPaymentNotice(null)}
                  className="ml-auto font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                <HiOutlineExclamationCircle className="text-base" />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    getAllProducts();
                  }}
                  className="ml-auto flex items-center gap-1 font-bold hover:underline"
                >
                  <HiOutlineRefresh /> Retry
                </button>
              </div>
            )}

            {allProducts.length === 0 ? (
              <div className="mx-auto mt-6 max-w-xl rounded-4xl border border-dashed border-cream-300 bg-cream-50/70 p-10 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-2xl text-white shadow-indigo">
                  <HiOutlineShoppingCart />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink dark:text-white">
                  Your cart is empty
                </h3>
                <p className="mt-1.5 text-sm text-ink/50 dark:text-slate-400">
                  {isLoading
                    ? "Loading cart items…"
                    : "Scan a product barcode or enter one manually to add it to this cart."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 animate-fade-in-up sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allProducts.map((item) => (
                  <ShoppingCards
                    key={item._id}
                    _id={item._id}
                    Product_name={item.product_name || item.Product_name}
                    Quantity={Number(item.Quantity)}
                    Manufacturer={item.Manufacturer}
                    Price={Number(item.Price)}
                    weight={Number(item.weight)}
                    onSubtract={() => openRemoveProduct(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky Grand Total Bar — only while a session is active */}
      {cart && (
        <div className="fixed inset-x-0 bottom-5 z-40 mx-auto w-[94%] max-w-4xl animate-fade-in-up">
          <div className="flex items-center gap-4 rounded-full border border-slate-800 bg-slate-900/95 px-5 py-3.5 text-white shadow-lift backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0F172A]/95 sm:gap-6 sm:px-7 sm:py-4">
            <div className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Grand total
              </span>
              <span className="block font-display text-xl font-bold leading-tight text-citrus-400 font-mono sm:text-2xl">
                ₹{grandTotal}
              </span>
            </div>

            <div className="hidden min-w-0 border-l border-white/10 pl-5 sm:block sm:pl-7">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Basket weight
              </span>
              <span className="block font-display text-base font-semibold leading-tight text-slate-200">
                {totalWeightLabel}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden shrink-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 md:flex">
                <HiOutlineShieldCheck className="text-sm text-citrus-400" />
                Stripe secured
              </span>
              <button
                type="button"
                disabled={!allProducts.length || isRedirectingToCheckout}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-indigo transition-all duration-200 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:px-7"
                onClick={handleOpenPayment}
              >
                {isRedirectingToCheckout ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="hidden sm:inline">Opening Stripe…</span>
                    <span className="sm:hidden">Opening…</span>
                  </>
                ) : (
                  "Pay Now"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store QR scanner modal */}
      {storeScanModalOpen && (
        <QrScanner
          busy={isScanningStore}
          title="Scan store QR"
          subtitle="Point the camera at the QR code at the supermarket entrance."
          onDetected={handleStoreScanDetected}
          onClose={() => {
            setStoreScanModalOpen(false);
            setTimeout(() => storeInputRef.current?.focus(), 50);
          }}
        />
      )}

      {/* Cart QR scanner modal */}
      {scanModalOpen && (
        <QrScanner
          busy={isStartingSession}
          title="Scan cart QR"
          subtitle="Point the camera at the QR code on the cart display."
          onDetected={handleScanDetected}
          onClose={() => {
            setScanModalOpen(false);
            setTimeout(() => manualInputRef.current?.focus(), 50);
          }}
        />
      )}

      {/* Product barcode scanner + manual entry modal */}
      {productScanOpen && (
        <QrScanner
          busy={isAddingProduct}
          title="Scan product"
          subtitle="Point the camera at the barcode printed on the product."
          formats={PRODUCT_BARCODE_FORMATS}
          closeLabel="Cancel"
          onDetected={handleProductScanDetected}
          onClose={() => {
            if (!isAddingProduct) setProductScanOpen(false);
          }}
          footer={
            <form onSubmit={handleManualBarcodeSubmit} className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35 dark:text-cream-100/35">
                  or enter barcode
                </span>
                <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
              </div>

              <input
                ref={barcodeInputRef}
                type="text"
                inputMode="numeric"
                value={manualBarcode}
                onChange={(e) => {
                  setManualBarcode(e.target.value);
                  setProductScanError(null);
                }}
                placeholder="Enter product barcode"
                autoComplete="off"
                autoFocus
                className="field"
              />

              <button
                type="submit"
                disabled={isAddingProduct || !manualBarcode.trim()}
                className="btn-lime w-full py-3 text-[11px] uppercase tracking-[0.12em]"
              >
                {isAddingProduct ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                    Adding…
                  </>
                ) : (
                  <>
                    Add to cart
                    <HiOutlineArrowRight />
                  </>
                )}
              </button>

              {productScanError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                  <HiOutlineExclamationCircle className="shrink-0 text-base" />
                  <span>{productScanError}</span>
                </div>
              )}

              <p className="text-center text-[10px] text-ink/35 dark:text-cream-100/35">
                Try <span className="font-mono">8906021120131</span> or{" "}
                <span className="font-mono">8902827000113</span>
              </p>
            </form>
          }
        />
      )}

      {/* Remove product: requires re-scanning the product's barcode */}
      {removeTarget && (
        <QrScanner
          busy={isRemoving}
          title={`Remove ${removeTarget.product_name || removeTarget._id}`}
          subtitle="Scan this product's barcode again to confirm removal."
          formats={PRODUCT_BARCODE_FORMATS}
          closeLabel="Keep product"
          onDetected={handleRemoveScanDetected}
          onClose={() => {
            if (!isRemoving) setRemoveTarget(null);
          }}
          footer={
            <form onSubmit={handleManualRemoveSubmit} className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink/35 dark:text-cream-100/35">
                  or enter barcode
                </span>
                <span className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
              </div>

              <input
                type="text"
                inputMode="numeric"
                value={removeBarcode}
                onChange={(e) => {
                  setRemoveBarcode(e.target.value);
                  setRemoveError(null);
                }}
                placeholder={`Barcode for ${removeTarget.product_name || removeTarget._id}`}
                autoComplete="off"
                autoFocus
                className="field"
              />

              <button
                type="submit"
                disabled={isRemoving || !removeBarcode.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 dark:disabled:bg-white/10 dark:disabled:text-white/30"
              >
                {isRemoving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Remove product
                    <HiOutlineArrowRight />
                  </>
                )}
              </button>

              {removeError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                  <HiOutlineExclamationCircle className="shrink-0 text-base" />
                  <span>{removeError}</span>
                </div>
              )}

              <p className="text-center text-[10px] text-ink/35 dark:text-cream-100/35">
                The barcode must match this product. Otherwise nothing is removed.
              </p>
            </form>
          }
        />
      )}
    </div>
  );
};

export default Home;
