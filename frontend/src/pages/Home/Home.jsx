import React, { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "../../components/Navbar/Navbar";
import ShoppingCards from "../../components/Cards/ShoppingCards";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import PaymentModal from "../../components/PaymentModal";

const Home = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  const [localProducts, setLocalProducts] = useState([
    {
      _id: "dummy-1",
      product_name: "Organic Whole Milk (1L)",
      Manufacturer: "Amul Dairy",
      Price: 68,
      Quantity: 2,
      weight: 1000
    },
    {
      _id: "dummy-2",
      product_name: "Rich Roast Ground Coffee",
      Manufacturer: "Nescafe Gold",
      Price: 420,
      Quantity: 1,
      weight: 200
    },
    {
      _id: "dummy-3",
      product_name: "Crunchy Honey Almond Granola",
      Manufacturer: "Kellogg's",
      Price: 310,
      Quantity: 3,
      weight: 450
    }
  ]);

  const navigate = useNavigate();

  const getUserInfo = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/get-user");
      if (response.data && response.data.user) {
        setUserInfo(response.data.user);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        console.error("Error fetching user info:", error);
        setError("Failed to fetch user information");
      }
    }
  }, [navigate]);

  const getAllProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/get-all-products");
      if (Array.isArray(response.data.products)) {
        setAllProducts(response.data.products);
        if (response.data.products.length > 0) {
          setLocalProducts(response.data.products);
        } else {
          setLocalProducts(prev => {
            const hasRealProducts = prev.some(item => !item._id.startsWith("dummy-"));
            if (hasRealProducts || prev.length === 0) {
              return [
                {
                  _id: "dummy-1",
                  product_name: "Organic Whole Milk (1L)",
                  Manufacturer: "Amul Dairy",
                  Price: 68,
                  Quantity: 2,
                  weight: 1000
                },
                {
                  _id: "dummy-2",
                  product_name: "Rich Roast Ground Coffee",
                  Manufacturer: "Nescafe Gold",
                  Price: 420,
                  Quantity: 1,
                  weight: 200
                },
                {
                  _id: "dummy-3",
                  product_name: "Crunchy Honey Almond Granola",
                  Manufacturer: "Kellogg's",
                  Price: 310,
                  Quantity: 3,
                  weight: 450
                }
              ];
            }
            return prev;
          });
        }
      } else {
        setError("Failed to load products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Unable to fetch products. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserInfo();
    getAllProducts();
    const interval = setInterval(() => {
      getAllProducts();
    }, 2000);
    return () => clearInterval(interval);
  }, [getUserInfo, getAllProducts]);

  const handleSubtractProduct = async (productId) => {
    if (productId.startsWith("dummy-")) {
      setLocalProducts(prev => prev.map(item => {
        if (item._id === productId) {
          if (item.Quantity > 1) {
            const unitWeight = item.weight / item.Quantity;
            return {
              ...item,
              Quantity: item.Quantity - 1,
              weight: item.weight - unitWeight
            };
          }
          return null;
        }
        return item;
      }).filter(Boolean));
      return;
    }

    try {
      await axiosInstance.delete(`/remove-product/${productId}`);
      await getAllProducts();
    } catch (error) {
      console.error("Subtract error:", error.response?.data || error.message);
      setError("Failed to subtract product quantity");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (productId.startsWith("dummy-")) {
      setLocalProducts(prev => prev.filter(item => item._id !== productId));
      return;
    }

    try {
      await axiosInstance.delete(`/remove-product/${productId}`);
      await getAllProducts();
    } catch (error) {
      console.error("Delete error:", error.response?.data || error.message);
      setError("Failed to remove product");
    }
  };

  const grandTotal = useMemo(() => {
    return localProducts.reduce((total, product) => {
      return total + parseInt(product.Price) * Number(product.Quantity);
    }, 0);
  }, [localProducts]);

  const totalWeight = useMemo(() => {
    const weight = localProducts.reduce((total, product) => {
      const qty = Number(product.Quantity) || 1;
      return total + (parseInt(product.weight) / qty) * qty;
    }, 0);
    return weight >= 1000 ? (weight / 1000).toFixed(1) + "kg" : weight + "g";
  }, [localProducts]);

  const updateAdafruitIO = async () => {
    try {
      const response = await axiosInstance.post("/update-adafruit");
      console.log("✅ Adafruit IO updated successfully:", response.data);
    } catch (error) {
      console.error("❌ Error updating Adafruit IO:", error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4FAF5] via-[#E8F3E9] to-[#F4FAF5] dark:from-[#081209] dark:via-[#0F1E12] dark:to-[#081209] text-slate-800 dark:text-slate-100 pb-36 font-sans transition-colors duration-300">
      <Navbar userInfo={userInfo} />
      
      <div className="container mx-auto px-6 mt-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#16331C] dark:text-white tracking-tight">Your Smart Basket</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time telemetry and management of items inside your physical shopping cart.</p>
          </div>
        </div>

        {allProducts.length === 0 && (
          <div className="bg-[#137A24]/10 dark:bg-emerald-950/40 border border-[#137A24]/20 dark:border-emerald-800/40 rounded-2xl px-5 py-3.5 mb-8 flex items-center gap-2 text-sm text-[#137A24] dark:text-emerald-400 font-semibold animate-fade-in-up max-w-3xl">
            <span className="text-lg">💡</span>
            <span>Showing preview items because your physical cart is empty. Connect a product or trigger cart additions to see live telemetry.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
          {localProducts.map((item) => (
            <ShoppingCards
              key={item._id}
              _id={item._id}
              Product_name={item.product_name || item.Product_name}
              Quantity={Number(item.Quantity)}
              Manufacturer={item.Manufacturer}
              Price={parseInt(item.Price)}
              weight={parseInt(item.weight)}
              onDelete={() => handleDeleteProduct(item._id)}
              onSubtract={() => handleSubtractProduct(item._id)}
            />
          ))}
        </div>
      </div>

      {/* Sticky Grand Total Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-4xl h-24 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-2xl rounded-[32px] flex items-center px-8 z-40 transition-colors">
        <div className="flex w-full justify-between items-center gap-6">
          <div className="flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Grand Total</span>
            <span className="text-2xl font-extrabold text-[#137A24] dark:text-emerald-400">₹{grandTotal}</span>
          </div>
          <div className="flex-1 border-l border-r border-slate-100 dark:border-slate-800 px-6 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Basket Weight</span>
            <span className="text-lg font-extrabold text-slate-800 dark:text-white">{totalWeight}</span>
          </div>
          <div className="flex-1 text-right">
            <button 
              className="bg-[#137A24] hover:bg-[#0E621C] text-white px-8 py-3.5 rounded-2xl shadow-lg shadow-green-900/10 font-bold transition-all duration-200 active:scale-95 text-xs uppercase tracking-wider" 
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Pay Now
            </button>
          </div>
        </div>
      </div>

      {/* Payment & Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartItems={localProducts}
        grandTotal={grandTotal}
        onPaymentSuccess={() => {
          // Clear cart on payment
          setLocalProducts([]);
          getAllProducts();
        }}
      />
    </div>
  );
};

export default Home;
