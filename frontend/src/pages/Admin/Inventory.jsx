import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineQrcode,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineLightningBolt,
  HiOutlineLogout,
  HiOutlineUser,
  HiOutlineStatusOnline,
  HiOutlineShieldCheck,
  HiOutlineReceiptTax,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiX,
} from "react-icons/hi";
import axiosInstance from "../../utils/axiosInstance";
import ThemeToggle from "../../components/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { connectSocket } from "../../utils/socket";

const TABS = {
  INVENTORY: "inventory",
  CARTS: "carts",
  TRANSACTIONS: "transactions",
  GATES: "gates",
};

const Inventory = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Active tab state: "inventory" | "carts" | "gates"
  const [activeTab, setActiveTab] = useState(TABS.INVENTORY);

  // Data states
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [carts, setCarts] = useState([]);
  const [store, setStore] = useState({ storeCode: null, storeName: null, numberOfGates: 1 });

  // Transactions History States
  const [transactions, setTransactions] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [txSearchQuery, setTxSearchQuery] = useState("");

  // Socket.IO Real-Time States
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveNotice, setLiveNotice] = useState(null);

  // Notifications
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setActionError("");
    setTimeout(() => setActionSuccess(""), 4500);
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(""), 5000);
  };

  // Add / Edit Product Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    barcode: "",
    product_name: "",
    manufacturer: "",
    price: "",
    stockQuantity: "",
    weight: "",
  });
  const [modalError, setModalError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Add Cart Modal states
  const [isAddCartOpen, setIsAddCartOpen] = useState(false);
  const [newCartCode, setNewCartCode] = useState("");
  const [addCartLoading, setAddCartLoading] = useState(false);
  const [cartModalError, setCartModalError] = useState("");

  // Gate Management states
  const [isPulsingGate, setIsPulsingGate] = useState(false);
  const [pulsingGateNumber, setPulsingGateNumber] = useState(null);
  const [isSyncingGates, setIsSyncingGates] = useState(false);
  const [gateNotice, setGateNotice] = useState(null);
  const [testPassCode, setTestPassCode] = useState("");
  const [isTestingPass, setIsTestingPass] = useState(false);
  const [passTestResult, setPassTestResult] = useState(null);

  // Fetch Inventory, Carts, and Stats
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/inventory");
      if (res.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
      }
      if (res.data && Array.isArray(res.data.carts)) {
        setCarts(res.data.carts);
      }
      if (res.data?.store) {
        setStore(res.data.store);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      showError("Could not load store data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/inventory/stats");
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const res = await axiosInstance.get("/inventory/transactions");
      if (res.data && Array.isArray(res.data.transactions)) {
        setTransactions(res.data.transactions);
        setTotalRevenue(res.data.totalRevenue || 0);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchStats();
    fetchTransactions();
  }, [fetchInventory, fetchStats, fetchTransactions]);

  // Real-Time Socket.IO Synchronization for Shopkeeper
  useEffect(() => {
    const socket = connectSocket(store?.storeCode);

    const handleConnect = () => {
      setIsSocketConnected(true);
      if (store?.storeCode) {
        socket.emit("join-store", { storeCode: store.storeCode });
      }
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleStockReduced = (data) => {
      const itemsPurchased = (data.items || [])
        .map((it) => `${it.quantityDeducted}x ${it.productName}`)
        .join(", ");

      setLiveNotice({
        type: "stock",
        title: "Product Stock Reduced",
        message: itemsPurchased
          ? `Customer checkout: ${itemsPurchased}`
          : "Customer completed checkout. Shelf stock adjusted.",
      });

      // Update matching items directly in local state for instantaneous UI response
      if (Array.isArray(data.items)) {
        setItems((prevItems) =>
          prevItems.map((item) => {
            const match = data.items.find(
              (it) =>
                String(it.productId) === String(item.productId || item._id) ||
                (it.barcode && it.barcode === item.barcode)
            );
            if (match) {
              return {
                ...item,
                stockQuantity: match.newQuantity,
                quantity: match.newQuantity,
              };
            }
            return item;
          })
        );
      }

      // Refresh store analytics counts
      fetchStats();

      setTimeout(() => {
        setLiveNotice((curr) => (curr?.type === "stock" ? null : curr));
      }, 6000);
    };

    const handleCartStatus = (data) => {
      if (Array.isArray(data.carts)) {
        setCarts(data.carts);
      } else if (data.cartCode && data.status) {
        setCarts((prev) =>
          prev.map((c) =>
            c.cartCode === data.cartCode
              ? { ...c, status: data.status, sessionId: data.sessionId ?? c.sessionId }
              : c
          )
        );
      }

      setLiveNotice({
        type: "cart",
        title: "Cart Status Changed",
        message: `Cart ${data.cartCode || ""} status changed to "${data.status || ""}"`,
      });

      setTimeout(() => {
        setLiveNotice((curr) => (curr?.type === "cart" ? null : curr));
      }, 4000);
    };

    const handleInventoryUpdated = () => {
      fetchInventory();
      fetchStats();
    };

    const handleNewTransaction = (data) => {
      if (data?.transaction) {
        setTransactions((prev) => [data.transaction, ...prev]);
        setTotalRevenue((prev) => prev + (Number(data.transaction.totalAmount) || 0));
        setLiveNotice({
          type: "transaction",
          title: "New Purchase Received",
          message: `Cart ${data.transaction.cartCode || ""} paid ₹${data.transaction.totalAmount || 0} (${data.transaction.itemsCount || 1} items)`,
        });
        setTimeout(() => {
          setLiveNotice((curr) => (curr?.type === "transaction" ? null : curr));
        }, 5000);
      }
    };

    if (socket.connected) {
      setIsSocketConnected(true);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("inventory:stock-reduced", handleStockReduced);
    socket.on("cart:status-changed", handleCartStatus);
    socket.on("inventory:updated", handleInventoryUpdated);
    socket.on("transaction:new", handleNewTransaction);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("inventory:stock-reduced", handleStockReduced);
      socket.off("cart:status-changed", handleCartStatus);
      socket.off("inventory:updated", handleInventoryUpdated);
      socket.off("transaction:new", handleNewTransaction);
    };
  }, [store?.storeCode, fetchInventory, fetchStats]);

  /* ---------------------------- Product Handlers ---------------------------- */
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      barcode: "890" + Math.floor(1000000000 + Math.random() * 9000000000),
      product_name: "",
      manufacturer: "",
      price: "",
      stockQuantity: "50",
      weight: "",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      barcode: item.barcode,
      product_name: item.product_name,
      manufacturer: item.manufacturer,
      price: item.price,
      stockQuantity: item.stockQuantity,
      weight: item.weight,
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    setModalError("");

    if (
      !formData.barcode ||
      !formData.product_name ||
      !formData.manufacturer ||
      !formData.price ||
      !formData.weight
    ) {
      setModalError("Please complete all required fields.");
      return;
    }

    setSaveLoading(true);
    try {
      if (editingItem) {
        await axiosInstance.put(`/inventory/${editingItem._id}`, formData);
        showSuccess(`Updated "${formData.product_name}" in catalogue.`);
      } else {
        await axiosInstance.post("/inventory", formData);
        showSuccess(`Added "${formData.product_name}" to inventory.`);
      }

      setIsModalOpen(false);
      await fetchInventory();
      await fetchStats();
    } catch (err) {
      console.error("Save error:", err);
      setModalError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;

    try {
      await axiosInstance.delete(`/inventory/${id}`);
      showSuccess(`Deleted "${name}" from inventory.`);
      await fetchInventory();
      await fetchStats();
    } catch (err) {
      console.error("Delete error:", err);
      showError("Failed to delete product.");
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await axiosInstance.post("/inventory/seed");
      await fetchInventory();
      await fetchStats();
      showSuccess("Catalogue re-seeded with standard store products!");
    } catch (err) {
      console.error("Seed error:", err);
      showError("Failed to re-seed sample data.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ Cart Handlers ----------------------------- */
  const handleAddCart = async (e) => {
    e.preventDefault();
    const code = newCartCode.trim().toUpperCase();
    if (!code) {
      setCartModalError("Please enter a valid cart code (e.g. CART-06)");
      return;
    }

    setAddCartLoading(true);
    setCartModalError("");
    try {
      const res = await axiosInstance.post("/inventory/cart", { cartCode: code });
      if (res.data?.carts) {
        setCarts(res.data.carts);
      } else {
        await fetchInventory();
      }
      setIsAddCartOpen(false);
      setNewCartCode("");
      showSuccess(`Smart Cart "${code}" registered to ${store.storeName || "store"}!`);
    } catch (err) {
      console.error("Add cart error:", err);
      setCartModalError(err.response?.data?.message || "Failed to register new cart.");
    } finally {
      setAddCartLoading(false);
    }
  };

  const handleResetCart = async (cartCode) => {
    try {
      const res = await axiosInstance.post(`/inventory/cart/${encodeURIComponent(cartCode)}/reset`);
      if (res.data?.carts) {
        setCarts(res.data.carts);
      } else {
        await fetchInventory();
      }
      showSuccess(`Cart "${cartCode}" status reset to Free.`);
    } catch (err) {
      console.error("Reset cart error:", err);
      showError(err.response?.data?.message || "Failed to reset cart status.");
    }
  };

  /* ------------------------------ Gate Handlers ----------------------------- */
  const handlePulseGate = async (gateNumber = 1) => {
    setIsPulsingGate(true);
    setPulsingGateNumber(gateNumber);
    setGateNotice(null);
    try {
      const res = await axiosInstance.post("/inventory/gate/pulse", { gateNumber });
      setGateNotice({
        type: "success",
        text: res.data?.message || `Exit gate #${gateNumber} pulsed successfully!`,
      });
      showSuccess(`Exit Barrier #${gateNumber} pulsed open (ON) & closed (OFF).`);
    } catch (err) {
      console.error("Gate pulse error:", err);
      setGateNotice({
        type: "error",
        text: err.response?.data?.message || `Could not pulse gate #${gateNumber}.`,
      });
    } finally {
      setIsPulsingGate(false);
      setPulsingGateNumber(null);
    }
  };

  const handleSyncGates = async () => {
    setIsSyncingGates(true);
    setGateNotice(null);
    try {
      const res = await axiosInstance.post("/inventory/gate/sync");
      setGateNotice({
        type: "success",
        text: res.data?.message || "Adafruit IO gate buttons synced in closed (OFF) state!",
      });
      showSuccess("Adafruit IO feeds & dashboard buttons synced!");
    } catch (err) {
      console.error("Gate sync error:", err);
      setGateNotice({
        type: "error",
        text: err.response?.data?.message || "Failed to sync gates with Adafruit IO.",
      });
    } finally {
      setIsSyncingGates(false);
    }
  };

  const handleTestPassCode = async (e) => {
    e.preventDefault();
    const code = testPassCode.trim();
    if (!code) return;

    setIsTestingPass(true);
    setPassTestResult(null);
    try {
      const res = await axiosInstance.post("/gate/unlock", {
        gateCode: code,
      });
      setPassTestResult({
        success: true,
        message: res.data?.message || "Gate pass validated! Barrier opened.",
        data: res.data,
      });
    } catch (err) {
      console.error("Gate test error:", err);
      setPassTestResult({
        success: false,
        message: err.response?.data?.message || "Invalid or expired gate pass code.",
      });
    } finally {
      setIsTestingPass(false);
    }
  };

  // Product filtering
  const filteredItems = items.filter((item) => {
    return (
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.includes(searchQuery)
    );
  });

  // Transaction filtering
  const filteredTransactions = transactions.filter((t) => {
    const q = txSearchQuery.toLowerCase();
    return (
      t.cartCode?.toLowerCase().includes(q) ||
      t.customer?.fullName?.toLowerCase().includes(q) ||
      t.customer?.email?.toLowerCase().includes(q) ||
      t.sessionId?.toLowerCase().includes(q) ||
      t.gateCode?.toLowerCase().includes(q)
    );
  });

  const freeCartsCount = carts.filter((c) => c.status === "Free").length;
  const inUseCartsCount = carts.filter((c) => c.status !== "Free").length;

  return (
    <div className="min-h-screen bg-cream-100 pb-24 font-sans text-ink transition-colors duration-300 dark:bg-[#090D16] dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-cream-300/80 bg-cream-100/90 backdrop-blur-xl transition-colors dark:border-white/[0.08] dark:bg-[#090D16]/90">
        <div className="flex h-[72px] w-full items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cream-300 bg-cream-50 text-ink shadow-soft transition-colors hover:border-brand-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              title="Back to home"
            >
              <HiOutlineArrowLeft className="text-lg" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo">
                🛒
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold tracking-tight text-ink dark:text-white">
                    Bask<span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-citrus-400 bg-clip-text text-transparent">It</span>
                  </span>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-400/25 dark:bg-brand-500/15 dark:text-brand-300">
                    Manager
                  </span>
                </div>
                <span className="text-[10px] text-ink/40 dark:text-slate-400">
                  {store.storeName || "Supermarket Central"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Socket.IO Status Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                isSocketConnected
                  ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/20"
                  : "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/20"
              }`}
              title={
                isSocketConnected
                  ? `Live real-time sync active (Store: ${store?.storeCode || "Connected"})`
                  : "Connecting to real-time sync..."
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="font-mono text-[11px] font-semibold tracking-wider">
                {isSocketConnected ? "LIVE SYNC" : "CONNECTING"}
              </span>
            </div>

            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-4 py-2 text-xs font-semibold text-ink/70 transition-colors hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-cream-100/70 dark:hover:text-red-400"
            >
              <HiOutlineLogout className="text-base" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Section Layout */}
      <div className="mt-8 flex w-full flex-col gap-8 px-6 sm:px-8 lg:flex-row lg:px-10">
        {/* ========================================================================= */}
        {/* LEFT SECTION: Profile Details & Store Identity Command Center             */}
        {/* ========================================================================= */}
        <aside className="w-full shrink-0 space-y-6 lg:w-80 xl:w-96">
          {/* Profile Card */}
          <div className="rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/[0.08] dark:bg-[#0F172A]">
            <div className="flex items-start gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 font-display text-xl font-bold text-white shadow-indigo">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : <HiOutlineUser />}
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-cream-50 bg-emerald-500 dark:border-[#0F172A]" />
              </div>

              <div className="min-w-0 flex-1">
                <span className="micro block text-brand-600 dark:text-citrus-400">
                  Store Manager
                </span>
                <h2 className="truncate font-display text-lg font-bold text-ink dark:text-white">
                  {user?.name || "Shopkeeper"}
                </h2>
                <p className="truncate text-xs text-ink/50 dark:text-slate-400">
                  {user?.email || "manager@baskit.store"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cream-200 bg-cream-100/70 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
              <span className="micro block">Supermarket ID</span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-ink dark:text-white">
                  {store.storeCode || "BASKIT-MART"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-citrus-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-citrus-700 dark:text-citrus-300">
                  <HiOutlineQrcode /> QR Ready
                </span>
              </div>
              <p className="mt-1.5 text-[10px] leading-tight text-ink/40 dark:text-slate-400">
                Customers scan this entrance QR to begin shopping here.
              </p>
            </div>
          </div>

          {/* Quick Store Metrics */}
          <div className="rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/[0.08] dark:bg-[#0F172A]">
            <span className="eyebrow block">Live Store Overview</span>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-cream-200 bg-cream-100/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                <span className="micro block">Total Products</span>
                <span className="mt-1 block font-display text-xl font-bold text-ink dark:text-cream-100">
                  {stats.totalProducts || items.length}
                </span>
              </div>

              <div className="rounded-2xl border border-cream-200 bg-cream-100/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                <span className="micro block">Carts Fleet</span>
                <span className="mt-1 block font-display text-xl font-bold text-brand-700 dark:text-citrus-400">
                  {freeCartsCount}/{carts.length || 5} Free
                </span>
              </div>

              <div className="rounded-2xl border border-cream-200 bg-cream-100/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                <span className="micro block">Exit Barriers</span>
                <span className="mt-1 block font-display text-xl font-bold text-ink dark:text-cream-100">
                  {store.numberOfGates || 1} Gate
                </span>
              </div>

              <div className="rounded-2xl border border-cream-200 bg-cream-100/60 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                <span className="micro block">Low Stock</span>
                <span className="mt-1 block font-display text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.lowStockCount || items.filter((i) => (i.stockQuantity || 0) < 10).length}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ink p-3.5 text-cream-100 dark:bg-white/[0.04]">
                <span className="micro block text-cream-100/40">Store Revenue</span>
                <div className="mt-0.5 font-display text-lg font-bold text-citrus-400">
                  ₹{totalRevenue ? totalRevenue.toLocaleString() : "0"}
                </div>
                <span className="text-[10px] text-cream-100/40">{transactions.length} paid sales</span>
              </div>

              <div className="rounded-2xl bg-ink p-3.5 text-cream-100 dark:bg-white/[0.04]">
                <span className="micro block text-cream-100/40">Stock Value</span>
                <div className="mt-0.5 font-display text-lg font-bold text-citrus-400">
                  ₹{stats.totalValue ? stats.totalValue.toLocaleString() : "0"}
                </div>
                <span className="text-[10px] text-cream-100/40">Catalogue value</span>
              </div>
            </div>

            <button
              onClick={handleSeed}
              className="btn-ghost mt-4 w-full py-2.5 text-xs"
              title="Reset catalogue with standard test products"
            >
              <HiOutlineRefresh /> Re-sync sample data
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* RIGHT SECTION: Three Main Management Sections (Inventory, Carts, Gates)   */}
        {/* ========================================================================= */}
        <main className="min-w-0 flex-1">
          {/* Notification Alerts */}
          {liveNotice && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-citrus-400/40 bg-citrus-400/10 px-5 py-3 text-sm font-semibold text-brand-900 shadow-soft animate-fade-in-up dark:border-citrus-400/30 dark:bg-citrus-400/10 dark:text-citrus-300">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-citrus-400 text-ink text-sm font-bold shadow-soft">
                  ⚡
                </span>
                <div>
                  <span className="font-bold">{liveNotice.title}: </span>
                  <span className="font-normal">{liveNotice.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveNotice(null)}
                className="rounded-lg p-1 text-ink/40 hover:bg-black/5 hover:text-ink dark:text-cream-100/40 dark:hover:bg-white/10 dark:hover:text-cream-100"
                title="Dismiss"
              >
                <HiX />
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700 animate-fade-in-up dark:border-brand-800 dark:bg-brand-900/30 dark:text-citrus-300">
              <HiOutlineCheckCircle className="shrink-0 text-xl" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 animate-fade-in-up dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <HiOutlineExclamationCircle className="shrink-0 text-xl" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Top 3 Management Buttons (Tabs) */}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-cream-300 bg-cream-50 p-2 shadow-soft dark:border-white/[0.08] dark:bg-[#0F172A]">
            <button
              type="button"
              onClick={() => setActiveTab(TABS.INVENTORY)}
              className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all ${
                activeTab === TABS.INVENTORY
                  ? "bg-brand-600 text-white shadow-indigo dark:bg-brand-500"
                  : "text-ink/60 hover:bg-cream-200/60 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <HiOutlineCube className="text-base" />
              <span>Inventory</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                activeTab === TABS.INVENTORY
                  ? "bg-white/20 text-white"
                  : "bg-cream-200 text-ink/70 dark:bg-white/10 dark:text-slate-300"
              }`}>
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(TABS.CARTS)}
              className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all ${
                activeTab === TABS.CARTS
                  ? "bg-brand-600 text-white shadow-indigo dark:bg-brand-500"
                  : "text-ink/60 hover:bg-cream-200/60 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <HiOutlineShoppingCart className="text-base" />
              <span>Carts</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                activeTab === TABS.CARTS
                  ? "bg-white/20 text-white"
                  : "bg-cream-200 text-ink/70 dark:bg-white/10 dark:text-slate-300"
              }`}>
                {carts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(TABS.TRANSACTIONS)}
              className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all ${
                activeTab === TABS.TRANSACTIONS
                  ? "bg-brand-600 text-white shadow-indigo dark:bg-brand-500"
                  : "text-ink/60 hover:bg-cream-200/60 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <HiOutlineReceiptTax className="text-base" />
              <span>Transactions</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                activeTab === TABS.TRANSACTIONS
                  ? "bg-white/20 text-white"
                  : "bg-cream-200 text-ink/70 dark:bg-white/10 dark:text-slate-300"
              }`}>
                {transactions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(TABS.GATES)}
              className={`flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition-all ${
                activeTab === TABS.GATES
                  ? "bg-brand-600 text-white shadow-indigo dark:bg-brand-500"
                  : "text-ink/60 hover:bg-cream-200/60 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <HiOutlineLockClosed className="text-base" />
              <span>Gates</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                activeTab === TABS.GATES
                  ? "bg-white/20 text-white"
                  : "bg-cream-200 text-ink/70 dark:bg-white/10 dark:text-slate-300"
              }`}>
                {store.numberOfGates || 1}
              </span>
            </button>
          </div>

          {/* =================================================================== */}
          {/* TAB 1: INVENTORY MANAGEMENT                                         */}
          {/* =================================================================== */}
          {activeTab === TABS.INVENTORY && (
            <div className="space-y-6 animate-fade-in">
              {/* Header with Search and Add Product Button */}
              <div className="flex flex-col gap-4 rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink dark:text-cream-100">
                    Product Catalogue &amp; Stock
                  </h3>
                  <p className="mt-1 text-xs text-ink/50 dark:text-cream-100/50">
                    Manage shelf inventory, barcodes, weights, and product pricing.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleOpenAdd}
                    className="btn-lime px-5 py-3 text-xs uppercase tracking-[0.12em]"
                  >
                    <HiOutlinePlus className="text-base" />
                    Add Product
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink/35 dark:text-cream-100/35" />
                <input
                  type="text"
                  placeholder="Search products by name, manufacturer, or barcode…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="field pl-11"
                />
              </div>

              {/* Inventory Data Table */}
              <div className="overflow-hidden rounded-4xl border border-cream-300 bg-cream-50 shadow-soft dark:border-white/10 dark:bg-[#0F172A]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-cream-300 bg-cream-100/70 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-cream-100/40">
                        <th className="px-6 py-3.5">Barcode</th>
                        <th className="px-6 py-3.5">Product Name</th>
                        <th className="px-6 py-3.5">Manufacturer</th>
                        <th className="px-6 py-3.5">Price</th>
                        <th className="px-6 py-3.5">Stock Status</th>
                        <th className="px-6 py-3.5">Weight</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200 text-xs dark:divide-white/[0.06]">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-xs font-semibold text-ink/40 dark:text-cream-100/40">
                            Loading inventory items…
                          </td>
                        </tr>
                      ) : filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-xs font-semibold text-ink/40 dark:text-cream-100/40">
                            No products match your search. Click &quot;Add Product&quot; or re-sync data.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item._id} className="transition-colors hover:bg-cream-100/70 dark:hover:bg-white/[0.04]">
                            {/* Barcode */}
                            <td className="px-6 py-4 font-mono font-bold text-ink/70 dark:text-cream-100/70">
                              <span className="inline-flex items-center gap-1 rounded-full border border-cream-300 bg-cream-100 px-2.5 py-1 text-[10px] dark:border-white/10 dark:bg-white/5">
                                <HiOutlineQrcode /> {item.barcode}
                              </span>
                            </td>

                            {/* Name */}
                            <td className="px-6 py-4 font-display font-semibold text-ink dark:text-cream-100">
                              {item.product_name}
                            </td>

                            {/* Manufacturer */}
                            <td className="px-6 py-4 font-medium text-ink/55 dark:text-cream-100/55">
                              {item.manufacturer}
                            </td>

                            {/* Price */}
                            <td className="px-6 py-4 font-display font-bold text-brand-700 dark:text-citrus-400">
                              ₹{item.price}
                            </td>

                            {/* Stock */}
                            <td className="px-6 py-4">
                              {item.stockQuantity <= 5 ? (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                                  Critical ({item.stockQuantity})
                                </span>
                              ) : item.stockQuantity <= 15 ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                                  Low ({item.stockQuantity})
                                </span>
                              ) : (
                                <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700 dark:border-citrus-400/25 dark:bg-citrus-400/10 dark:text-citrus-300">
                                  In stock ({item.stockQuantity})
                                </span>
                              )}
                            </td>

                            {/* Weight */}
                            <td className="px-6 py-4 font-medium text-ink/45 dark:text-cream-100/45">
                              {item.weight}g
                            </td>

                            {/* Actions */}
                            <td className="space-x-1.5 px-6 py-4 text-right">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-cream-200 hover:text-ink dark:text-cream-100/40 dark:hover:bg-white/10 dark:hover:text-cream-100"
                                title="Edit product"
                              >
                                <HiOutlinePencil className="text-base" />
                              </button>

                              <button
                                onClick={() => handleDelete(item._id, item.product_name)}
                                className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                title="Delete product"
                              >
                                <HiOutlineTrash className="text-base" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: CARTS MANAGEMENT                                             */}
          {/* =================================================================== */}
          {activeTab === TABS.CARTS && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col gap-4 rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink dark:text-cream-100">
                    Smart Shopping Cart Fleet
                  </h3>
                  <p className="mt-1 text-xs text-ink/50 dark:text-cream-100/50">
                    IoT smart carts registered to {store.storeName || "this supermarket"}.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setNewCartCode(`CART-0${carts.length + 1}`);
                    setCartModalError("");
                    setIsAddCartOpen(true);
                  }}
                  className="btn-lime px-5 py-3 text-xs uppercase tracking-[0.12em]"
                >
                  <HiOutlinePlus className="text-base" />
                  Register New Cart
                </button>
              </div>

              {/* Status summary banner */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900/30 dark:bg-brand-950/20">
                  <span className="micro block text-brand-700 dark:text-citrus-300">Ready for Shoppers</span>
                  <div className="mt-2 font-display text-2xl font-bold text-brand-800 dark:text-citrus-300">
                    {freeCartsCount} Free Carts
                  </div>
                  <p className="mt-1 text-[11px] text-brand-700/60 dark:text-citrus-300/60">
                    Available to grab at entrance
                  </p>
                </div>

                <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <span className="micro block text-blue-700 dark:text-blue-300">Active in Store</span>
                  <div className="mt-2 font-display text-2xl font-bold text-blue-800 dark:text-blue-300">
                    {inUseCartsCount} Carts Active
                  </div>
                  <p className="mt-1 text-[11px] text-blue-700/60 dark:text-blue-300/60">
                    Currently shopping in aisles
                  </p>
                </div>

                <div className="rounded-3xl border border-cream-300 bg-cream-50 p-5 dark:border-white/10 dark:bg-[#0F172A]">
                  <span className="micro block">Fleet Capacity</span>
                  <div className="mt-2 font-display text-2xl font-bold text-ink dark:text-cream-100">
                    {carts.length} Total Registered
                  </div>
                  <p className="mt-1 text-[11px] text-ink/40 dark:text-cream-100/40">
                    Assigned to {store.storeCode || "store"}
                  </p>
                </div>
              </div>

              {/* Carts Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {carts.map((cart, idx) => {
                  const isFree = cart.status === "Free";
                  const isPayment = cart.status === "Payment";

                  return (
                    <div
                      key={cart.cartCode || idx}
                      className="group rounded-3xl border border-cream-300 bg-cream-50 p-5 shadow-soft transition-all hover:border-ink/20 dark:border-white/10 dark:bg-[#0F172A] dark:hover:border-citrus-400/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-citrus-400 text-xl text-ink">
                            <HiOutlineShoppingCart />
                          </span>
                          <div>
                            <span className="font-mono text-base font-bold text-ink dark:text-cream-100">
                              {cart.cartCode}
                            </span>
                            <span className="micro block text-ink/40 dark:text-cream-100/40">
                              Smart Basket Unit
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                            isFree
                              ? "bg-brand-600 text-white dark:bg-citrus-400 dark:text-ink"
                              : isPayment
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          }`}
                        >
                          {cart.status || "Free"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2 border-t border-cream-200/80 pt-4 text-xs text-ink/60 dark:border-white/5 dark:text-cream-100/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Telemetry link:</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-citrus-400">
                            <HiOutlineStatusOnline className="text-sm" /> Connected
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]">Assigned Store:</span>
                          <span className="font-mono text-[11px] font-semibold">
                            {store.storeCode || "BASKIT-MART"}
                          </span>
                        </div>
                      </div>

                      {!isFree && (
                        <div className="mt-4 pt-2">
                          <button
                            type="button"
                            onClick={() => handleResetCart(cart.cartCode)}
                            className="w-full rounded-full border border-amber-300 bg-amber-50 py-2 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            Reset to Free status
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: TRANSACTIONS & SALES HISTORY                                 */}
          {/* =================================================================== */}
          {activeTab === TABS.TRANSACTIONS && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col gap-4 rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink dark:text-cream-100">
                    Order &amp; Checkout Receipts
                  </h3>
                  <p className="mt-1 text-xs text-ink/50 dark:text-cream-100/50">
                    Live purchase history, Stripe Checkout receipts, and customer cart snapshots.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchTransactions}
                  disabled={transactionsLoading}
                  className="btn-lime px-5 py-3 text-xs uppercase tracking-[0.12em]"
                >
                  <HiOutlineRefresh className={`text-base ${transactionsLoading ? "animate-spin" : ""}`} />
                  Refresh Receipts
                </button>
              </div>

              {/* Transactions Metrics Banner */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-citrus-400/30 bg-citrus-400/10 p-5 dark:border-citrus-400/20 dark:bg-citrus-400/5">
                  <span className="micro block text-brand-800 dark:text-citrus-300">Total Store Revenue</span>
                  <div className="mt-2 font-display text-3xl font-bold text-brand-900 dark:text-citrus-300">
                    ₹{totalRevenue.toLocaleString()}
                  </div>
                  <p className="mt-1 text-[11px] text-brand-800/60 dark:text-citrus-300/60">
                    From {transactions.length} completed transactions
                  </p>
                </div>

                <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <span className="micro block text-blue-700 dark:text-blue-300">Total Orders Paid</span>
                  <div className="mt-2 font-display text-3xl font-bold text-blue-800 dark:text-blue-300">
                    {transactions.length}
                  </div>
                  <p className="mt-1 text-[11px] text-blue-700/60 dark:text-blue-300/60">
                    Autonomous checkout sessions
                  </p>
                </div>

                <div className="rounded-3xl border border-cream-300 bg-cream-50 p-5 dark:border-white/10 dark:bg-[#0F172A]">
                  <span className="micro block">Average Order Value</span>
                  <div className="mt-2 font-display text-3xl font-bold text-ink dark:text-cream-100">
                    ₹{transactions.length ? Math.round(totalRevenue / transactions.length) : 0}
                  </div>
                  <p className="mt-1 text-[11px] text-ink/40 dark:text-cream-100/40">
                    Per customer shopping cart
                  </p>
                </div>
              </div>

              {/* Search Filter */}
              <div className="flex items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2.5 shadow-soft dark:border-white/10 dark:bg-[#0F172A]">
                <HiOutlineSearch className="text-lg text-ink/40 dark:text-cream-100/40" />
                <input
                  type="text"
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  placeholder="Search transactions by customer, cart code, session ID, or gate code..."
                  className="w-full bg-transparent text-xs font-medium placeholder:text-ink/40 focus:outline-none dark:text-cream-100 dark:placeholder:text-cream-100/40"
                />
                {txSearchQuery && (
                  <button
                    onClick={() => setTxSearchQuery("")}
                    className="text-xs text-ink/40 hover:text-ink dark:text-cream-100/40 dark:hover:text-cream-100"
                  >
                    <HiX />
                  </button>
                )}
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="rounded-4xl border border-cream-300 bg-cream-50 p-12 text-center shadow-soft dark:border-white/10 dark:bg-[#0F172A]">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200 text-2xl text-ink/40 dark:bg-white/5 dark:text-cream-100/40">
                    <HiOutlineReceiptTax />
                  </span>
                  <h4 className="mt-4 font-display text-base font-bold text-ink dark:text-cream-100">
                    {txSearchQuery ? "No matching transactions found" : "No checkout transactions yet"}
                  </h4>
                  <p className="mt-1 text-xs text-ink/50 dark:text-cream-100/50 max-w-md mx-auto">
                    {txSearchQuery
                      ? "Try searching for a different cart code, customer email, or pass code."
                      : "When customers finish shopping and complete Stripe checkout, their detailed receipts and gate passes will appear here in real time."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((tx) => {
                    const isExpanded = expandedTxId === (tx.id || tx.sessionId);
                    const formattedDate = tx.completedAt
                      ? new Date(tx.completedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Recent";

                    return (
                      <div
                        key={tx.id || tx.sessionId}
                        className="overflow-hidden rounded-3xl border border-cream-300 bg-cream-50 shadow-soft transition-all hover:border-ink/20 dark:border-white/10 dark:bg-[#0F172A]"
                      >
                        {/* Transaction Card Header */}
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-lg text-citrus-400 shadow-soft dark:bg-citrus-400 dark:text-ink">
                              <HiOutlineReceiptTax />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-ink dark:text-cream-100">
                                  #{String(tx.sessionId).slice(0, 8).toUpperCase()}
                                </span>
                                <span className="rounded-full bg-brand-100 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-800 dark:bg-citrus-400/15 dark:text-citrus-300">
                                  {tx.cartCode}
                                </span>
                                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  ✓ {tx.paymentStatus}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    tx.gateStatus === "Unlocked"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                  }`}
                                >
                                  Gate {tx.gateStatus}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/60 dark:text-cream-100/60">
                                <span className="font-semibold text-ink dark:text-cream-100">
                                  {tx.customer?.fullName}
                                </span>
                                <span>•</span>
                                <span className="text-[11px]">{tx.customer?.email}</span>
                                <span>•</span>
                                <span className="text-[11px] font-mono">{formattedDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <div className="text-right">
                              <div className="font-display text-xl font-bold text-brand-700 dark:text-citrus-400">
                                ₹{tx.totalAmount}
                              </div>
                              <span className="micro block text-ink/40 dark:text-cream-100/40">
                                {tx.itemsCount || tx.items?.length || 0} item(s) • {tx.totalWeight}g
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTxId(isExpanded ? null : tx.id || tx.sessionId)
                              }
                              className="flex items-center gap-1 rounded-2xl border border-cream-300 bg-cream-100/80 px-3 py-2 text-xs font-semibold text-ink/70 transition-colors hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-cream-100/70"
                            >
                              <span>{isExpanded ? "Hide" : "Items"}</span>
                              {isExpanded ? (
                                <HiOutlineChevronUp className="text-sm" />
                              ) : (
                                <HiOutlineChevronDown className="text-sm" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Items Drawer */}
                        {isExpanded && (
                          <div className="border-t border-cream-200/80 bg-cream-100/50 p-5 dark:border-white/5 dark:bg-black/20">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="eyebrow block">Purchased Basket Lines</span>
                              <span className="font-mono text-[11px] text-ink/50 dark:text-cream-100/50">
                                Exit Gate Pass: {tx.gateCode || "N/A"}
                              </span>
                            </div>

                            <div className="divide-y divide-cream-200/60 rounded-2xl border border-cream-200/80 bg-cream-50 dark:divide-white/5 dark:border-white/5 dark:bg-[#0F172A]">
                              {(tx.items || []).map((line, idx) => (
                                <div
                                  key={line.barcode || line.productId || idx}
                                  className="flex items-center justify-between p-3.5 text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-ink dark:text-cream-100">
                                      {line.productName}
                                    </span>
                                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-ink/40 dark:text-cream-100/40">
                                      <span>Barcode: {line.barcode || "N/A"}</span>
                                      <span>•</span>
                                      <span>{line.weight}g</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="font-semibold text-ink dark:text-cream-100">
                                      ₹{line.price * (line.quantity || 1)}
                                    </div>
                                    <span className="text-[10px] text-ink/40 dark:text-cream-100/40">
                                      ₹{line.price} × {line.quantity || 1}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/50 dark:text-cream-100/50 font-mono">
                              <span>Session: {tx.sessionId}</span>
                              <span>Method: {tx.paymentMethod}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: GATES MANAGEMENT                                             */}
          {/* =================================================================== */}
          {activeTab === TABS.GATES && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col gap-4 rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink dark:text-cream-100">
                    Exit Gate &amp; Barrier Management
                  </h3>
                  <p className="mt-1 text-xs text-ink/50 dark:text-cream-100/50">
                    Smart barrier controls, single-use exit passes, and Adafruit IO telemetry.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncGates}
                    disabled={isSyncingGates}
                    className="btn-cream flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.12em]"
                    title="Provision and reset gate buttons on Adafruit IO"
                  >
                    <HiOutlineRefresh className={`text-base ${isSyncingGates ? "animate-spin" : ""}`} />
                    {isSyncingGates ? "Syncing Adafruit…" : "Sync Adafruit Buttons"}
                  </button>

                  <button
                    onClick={() => handlePulseGate(1)}
                    disabled={isPulsingGate}
                    className="btn-lime px-5 py-3 text-xs uppercase tracking-[0.12em]"
                  >
                    <HiOutlineLightningBolt className="text-base" />
                    {isPulsingGate && pulsingGateNumber === 1 ? "Pulsing Barrier…" : "⚡ Test Gate #1"}
                  </button>
                </div>
              </div>

              {gateNotice && (
                <div
                  className={`rounded-2xl border p-4 text-xs font-semibold ${
                    gateNotice.type === "success"
                      ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-citrus-300"
                      : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                  }`}
                >
                  {gateNotice.text}
                </div>
              )}

              {/* Gates Grid */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {Array.from({ length: store.numberOfGates || 1 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-2xl text-citrus-400 shadow-soft dark:bg-citrus-400 dark:text-ink">
                          <HiOutlineLockClosed />
                        </span>
                        <div>
                          <h4 className="font-display text-base font-bold text-ink dark:text-cream-100">
                            Exit Barrier #{idx + 1}
                          </h4>
                          <span className="micro block text-brand-600 dark:text-citrus-400">
                            Lane {idx + 1} Checkout Barrier
                          </span>
                        </div>
                      </div>

                      <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-700 dark:border-citrus-400/25 dark:bg-citrus-400/10 dark:text-citrus-300">
                        Barrier Armed
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 rounded-2xl border border-cream-200 bg-cream-100/70 p-4 text-xs dark:border-white/5 dark:bg-white/[0.03]">
                      <div className="flex justify-between">
                        <span className="text-ink/50 dark:text-cream-100/50">Barrier Hardware:</span>
                        <span className="font-semibold">Adafruit IO Servo Link</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/50 dark:text-cream-100/50">Barrier Feed:</span>
                        <span className="font-mono text-[11px] font-semibold text-brand-700 dark:text-citrus-400">
                          feeds/gate-{idx + 1}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/50 dark:text-cream-100/50">Barrier Cycle:</span>
                        <span className="font-semibold">Auto-close (4 seconds)</span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => handlePulseGate(idx + 1)}
                        disabled={isPulsingGate && pulsingGateNumber === idx + 1}
                        className="btn-lime w-full py-2.5 text-[11px] uppercase tracking-[0.12em]"
                      >
                        <HiOutlineLockOpen className="text-base" />
                        {isPulsingGate && pulsingGateNumber === idx + 1
                          ? `Opening Gate #${idx + 1}…`
                          : `Open Gate #${idx + 1} (4s pulse)`}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Exit Pass Verification Tool */}
                <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-soft dark:border-white/10 dark:bg-[#0F172A]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600 dark:bg-citrus-400/10 dark:text-citrus-400">
                      <HiOutlineShieldCheck />
                    </span>
                    <div>
                      <h4 className="font-display text-base font-bold text-ink dark:text-cream-100">
                        Exit Pass Validator
                      </h4>
                      <p className="text-[11px] text-ink/50 dark:text-cream-100/50">
                        Test or manually redeem a shopper&apos;s exit QR pass.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleTestPassCode} className="mt-5 space-y-3">
                    <input
                      type="text"
                      value={testPassCode}
                      onChange={(e) => setTestPassCode(e.target.value)}
                      placeholder="Enter pass code (e.g. PASS-XXXX or completed)"
                      className="field font-mono"
                    />

                    <button
                      type="submit"
                      disabled={isTestingPass || !testPassCode.trim()}
                      className="btn-primary w-full py-2.5 text-[11px] uppercase tracking-[0.12em]"
                    >
                      {isTestingPass ? "Validating Pass…" : "Verify & Unlock Pass"}
                    </button>
                  </form>

                  {passTestResult && (
                    <div
                      className={`mt-4 rounded-2xl border p-3.5 text-xs font-semibold ${
                        passTestResult.success
                          ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-citrus-300"
                          : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {passTestResult.message}
                    </div>
                  )}

                  <p className="mt-3 text-[10px] text-ink/40 dark:text-cream-100/40">
                    Typing <span className="font-mono font-bold">completed</span> bypasses verification for demo testing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT                                               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-lift dark:border-white/10 dark:bg-[#0F172A] sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-cream-300 bg-cream-100 text-ink/45 transition-colors hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-cream-100/45 dark:hover:text-cream-100"
              aria-label="Close"
            >
              <HiX className="text-lg" />
            </button>

            <span className="eyebrow">Catalogue</span>
            <h3 className="mt-2 font-display text-xl font-bold">
              {editingItem ? "Edit catalogue product" : "Add new inventory item"}
            </h3>
            <p className="mb-6 mt-1 text-xs leading-relaxed text-ink/50 dark:text-cream-100/50">
              {editingItem
                ? "Modify pricing, weight, or shelf stock levels."
                : "Register a barcode with weight and price so cart telemetry recognises it."}
            </p>

            {modalError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSave} className="space-y-4">
              <div>
                <label className="input-label" htmlFor="inventory-barcode">
                  Barcode (EAN-13)
                </label>
                <input
                  id="inventory-barcode"
                  type="text"
                  required
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="field font-mono"
                  placeholder="8901030643496"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="inventory-name">
                  Product name
                </label>
                <input
                  id="inventory-name"
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="field"
                  placeholder="e.g. Britannia Bourbon Biscuits"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="inventory-manufacturer">
                  Manufacturer / Brand
                </label>
                <input
                  id="inventory-manufacturer"
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="field"
                  placeholder="e.g. Britannia, Nestle, Amul"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="input-label" htmlFor="inventory-price">
                    Price (₹)
                  </label>
                  <input
                    id="inventory-price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="field"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="inventory-stock">
                    Stock Qty
                  </label>
                  <input
                    id="inventory-stock"
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="field"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="inventory-weight">
                    Weight (g)
                  </label>
                  <input
                    id="inventory-weight"
                    type="number"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="field"
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full px-4 py-2.5 text-xs font-semibold text-ink/50 transition-colors hover:text-ink dark:text-cream-100/50 dark:hover:text-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="btn-lime px-6 py-2.5 text-xs"
                >
                  {saveLoading ? "Saving…" : editingItem ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW SMART CART                                          */}
      {/* ========================================================================= */}
      {isAddCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-lift dark:border-white/10 dark:bg-[#0F172A] sm:p-7">
            <button
              onClick={() => setIsAddCartOpen(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-cream-300 bg-cream-100 text-ink/45 transition-colors hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-cream-100/45 dark:hover:text-cream-100"
              aria-label="Close"
            >
              <HiX className="text-lg" />
            </button>

            <span className="eyebrow">Smart Fleet</span>
            <h3 className="mt-2 font-display text-xl font-bold">
              Register New Smart Cart
            </h3>
            <p className="mb-5 mt-1 text-xs leading-relaxed text-ink/50 dark:text-cream-100/50">
              Add a new IoT shopping basket unit to {store.storeName || "your store"}.
            </p>

            {cartModalError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {cartModalError}
              </div>
            )}

            <form onSubmit={handleAddCart} className="space-y-4">
              <div>
                <label className="input-label" htmlFor="cart-code-input">
                  Cart Identifier Code
                </label>
                <input
                  id="cart-code-input"
                  type="text"
                  required
                  value={newCartCode}
                  onChange={(e) => setNewCartCode(e.target.value.toUpperCase())}
                  className="field font-mono"
                  placeholder="e.g. CART-06"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCartOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-ink/50 transition-colors hover:text-ink dark:text-cream-100/50 dark:hover:text-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCartLoading || !newCartCode.trim()}
                  className="btn-lime px-6 py-2.5 text-xs"
                >
                  {addCartLoading ? "Registering…" : "Register Cart"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
