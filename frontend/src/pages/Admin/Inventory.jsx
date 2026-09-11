import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineShoppingCart,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineQrcode,
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiX,
  HiOutlineDownload
} from "react-icons/hi";
import axiosInstance from "../../utils/axiosInstance";
import ThemeToggle from "../../components/ThemeToggle";

const Inventory = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modal states for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = Add mode, item = Edit mode
  const [formData, setFormData] = useState({
    barcode: "",
    product_name: "",
    manufacturer: "",
    price: "",
    stockQuantity: "",
    weight: "",
    category: "Grocery",
  });
  const [modalError, setModalError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  // Fetch Inventory and Stats
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/inventory");
      if (res.data && Array.isArray(res.data.items)) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
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

  useEffect(() => {
    fetchInventory();
    fetchStats();
  }, [fetchInventory, fetchStats]);

  // Handle Add / Edit Modal open
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      barcode: "890" + Math.floor(1000000000 + Math.random() * 9000000000),
      product_name: "",
      manufacturer: "",
      price: "",
      stockQuantity: "50",
      weight: "",
      category: "Packaged Goods",
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
      category: item.category || "Grocery",
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.barcode || !formData.product_name || !formData.manufacturer || !formData.price || !formData.weight) {
      setModalError("Please complete all required fields.");
      return;
    }

    setSaveLoading(true);
    try {
      if (editingItem) {
        // Update
        await axiosInstance.put(`/inventory/${editingItem._id}`, formData);
        setActionSuccess(`Updated "${formData.product_name}" successfully`);
      } else {
        // Create
        await axiosInstance.post("/inventory", formData);
        setActionSuccess(`Added "${formData.product_name}" to catalogue`);
      }

      setIsModalOpen(false);
      await fetchInventory();
      await fetchStats();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      console.error("Save error:", err);
      setModalError(err.response?.data?.message || "Failed to save product.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;

    try {
      await axiosInstance.delete(`/inventory/${id}`);
      setActionSuccess(`Deleted "${name}"`);
      await fetchInventory();
      await fetchStats();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete product.");
    }
  };

  // Re-seed from file
  const handleSeed = async () => {
    try {
      setLoading(true);
      await axiosInstance.post("/inventory/seed");
      await fetchInventory();
      await fetchStats();
      setActionSuccess("Catalogue re-seeded with store products!");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate scanning this item into shopper's active cart
  const handleSimulateScan = async (item) => {
    try {
      await axiosInstance.post("/add-product", {
        product_name: item.product_name,
        Manufacturer: item.manufacturer,
        Price: item.price,
        Quantity: 1,
        weight: item.weight,
      });
      setActionSuccess(`⚡ Simulated scan: Added "${item.product_name}" into customer cart!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      console.error("Scan simulation error:", err);
      alert("Could not scan item. Make sure you are logged in.");
    }
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.includes(searchQuery);

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0A140C] text-slate-800 dark:text-slate-100 font-sans pb-20 transition-colors duration-300">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
              title="Back to Landing Page"
            >
              <HiOutlineArrowLeft className="text-lg" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl flex items-center justify-center text-xl font-bold">
                🛒
              </div>
              <div>
                <h1 className="text-xl font-black text-[#16331C] dark:text-white tracking-tight flex items-center gap-2">
                  Bask<span className="text-[#137A24] dark:text-emerald-400">It</span>
                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                    Admin Inventory
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Shopkeeper catalogue &amp; stock control</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-bold text-[#137A24] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <HiOutlineShoppingCart /> Open Shopper Cart
            </button>
            <button
              onClick={handleOpenAdd}
              className="bg-[#137A24] hover:bg-[#0E621C] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <HiOutlinePlus className="text-base" /> Add Product
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Success Alert */}
        {actionSuccess && (
          <div className="mb-6 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl px-5 py-3 text-sm font-semibold flex items-center gap-2 animate-fade-in-up">
            <HiOutlineCheckCircle className="text-xl text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Catalogue SKUs
            </span>
            <div className="text-3xl font-black text-[#16331C] mt-2">
              {stats.totalProducts || items.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              ● All active store barcodes
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Stock Units
            </span>
            <div className="text-3xl font-black text-[#137A24] mt-2">
              {stats.totalStock || items.reduce((s, i) => s + (i.stockQuantity || 0), 0)}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
              Available across aisles
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Inventory Valuation
            </span>
            <div className="text-3xl font-black text-slate-800 mt-2">
              ₹{stats.totalValue ? stats.totalValue.toLocaleString() : "0"}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
              Calculated at retail price
            </span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Low Stock Alerts
            </span>
            <div className="text-3xl font-black text-amber-600 mt-2">
              {stats.lowStockCount || items.filter(i => (i.stockQuantity || 0) < 10).length}
            </div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              Items under 10 units
            </span>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search by product name, manufacturer or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[#137A24]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#137A24]"
            >
              <option value="all">All Categories</option>
              <option value="Grocery">Grocery</option>
              <option value="Packaged Goods">Packaged Goods</option>
              <option value="Dairy">Dairy</option>
              <option value="Personal Care">Personal Care</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleSeed}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
              title="Reset catalogue to sample products"
            >
              <HiOutlineRefresh /> Re-sync Sample Data
            </button>
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-6">Barcode / SKU</th>
                  <th className="py-3.5 px-6">Product Details</th>
                  <th className="py-3.5 px-6">Manufacturer</th>
                  <th className="py-3.5 px-6">Price</th>
                  <th className="py-3.5 px-6">Stock Status</th>
                  <th className="py-3.5 px-6">Weight</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                      No products found. Click "Add Product" or "Re-sync Sample Data".
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Barcode */}
                      <td className="py-4 px-6 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] border border-slate-200 inline-flex items-center gap-1">
                          <HiOutlineQrcode /> {item.barcode}
                        </span>
                      </td>

                      {/* Name & Category */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900">{item.product_name}</div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          {item.category || "Grocery"}
                        </span>
                      </td>

                      {/* Manufacturer */}
                      <td className="py-4 px-6 font-semibold text-slate-600">
                        {item.manufacturer}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-black text-[#137A24]">
                        ₹{item.price}
                      </td>

                      {/* Stock Level */}
                      <td className="py-4 px-6">
                        {item.stockQuantity <= 5 ? (
                          <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                            Critical ({item.stockQuantity})
                          </span>
                        ) : item.stockQuantity <= 15 ? (
                          <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            Low ({item.stockQuantity})
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            In Stock ({item.stockQuantity})
                          </span>
                        )}
                      </td>

                      {/* Weight */}
                      <td className="py-4 px-6 text-slate-500 font-medium">
                        {item.weight}g
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleSimulateScan(item)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                          title="Simulate adding to active shopper cart"
                        >
                          ⚡ Test Scan
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Product"
                        >
                          <HiOutlinePencil className="text-base" />
                        </button>

                        <button
                          onClick={() => handleDelete(item._id, item.product_name)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Product"
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
      </main>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <HiX className="text-lg" />
            </button>

            <h3 className="text-xl font-black text-[#16331C] mb-1">
              {editingItem ? "Edit Catalogue Product" : "Add New Inventory Item"}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {editingItem ? "Modify pricing, weight or stock quantities" : "Register a barcode with weight and price metrics for in-cart scanning"}
            </p>

            {modalError && (
              <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded-xl border border-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode (EAN-13)</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                    placeholder="8901030643496"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Packaged Goods">Packaged Goods</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                  placeholder="e.g. Maggi 2-Minute Noodles"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturer / Brand</label>
                <input
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                  placeholder="e.g. Nestle, Parle, ITC"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                    placeholder="14"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight (g)</label>
                  <input
                    type="number"
                    required
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#137A24]"
                    placeholder="70"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-[#137A24] hover:bg-[#0E621C] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {saveLoading ? "Saving..." : editingItem ? "Save Changes" : "Create Product"}
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
