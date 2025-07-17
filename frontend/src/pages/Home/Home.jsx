import React, { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "../../components/Navbar/Navbar";
import ShoppingCards from "../../components/Cards/ShoppingCards";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

const Home = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleDeleteProduct = async () => {
    try {
      // Just trigger rescan mode
      await axiosInstance.post("/set-rescan");
      console.log("Rescan mode activated");
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const grandTotal = useMemo(() => {
    return allProducts.reduce((total, product) => {
      return total + parseInt(product.Price) * Number(product.Quantity);
    }, 0);
  }, [allProducts]);

  const totalWeight = useMemo(() => {
    const weight = allProducts.reduce((total, product) => {
      return total + (parseInt(product.weight) / product.Quantity) * Number(product.Quantity);
    }, 0);
    return weight >= 1000 ? (weight / 1000).toFixed(1) + "kg" : weight + "g";
  }, [allProducts]);

  const updateAdafruitIO = async () => {
    try {
      const response = await axiosInstance.post("/update-adafruit");
      console.log("✅ Adafruit IO updated successfully:", response.data);
    } catch (error) {
      console.error("❌ Error updating Adafruit IO:", error.response?.data || error.message);
    }
  };

  return (
    <>
      <Navbar userInfo={userInfo} />
      {isLoading && (
        <div className="fixed top-0 left-0 w-full bg-yellow-200 text-center p-2">Loading products...</div>
      )}
      {error && (
        <div className="fixed top-0 left-0 w-full bg-red-200 text-center p-2">{error}</div>
      )}
      <div className="container mx-auto">
        <div className="grid grid-cols-4 gap-4 mt-8">
          {allProducts.map((item) => (
            <ShoppingCards
              key={item._id}
              _id={item._id}
              Product_name={item.product_name}
              Quantity={Number(item.Quantity)}
              Manufacturer={item.Manufacturer}
              Price={parseInt(item.Price)}
              weight={parseInt(item.weight)}
              onDelete={() => handleDeleteProduct(item)}
            />
          ))}
        </div>
      </div>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] h-20 bg-white/30 backdrop-blur-lg border border-white/50 shadow-lg rounded-2xl flex items-center px-8">
        <div className="flex w-full justify-around items-center">
          <div className="flex-1 text-left">
            <p className="text-black text-lg font-semibold">Grand Total = ₹{grandTotal}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-black text-lg font-semibold">Total Basket Weight = {totalWeight}</p>
          </div>
          <div className="flex-1 text-right">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-xl shadow-md hover:bg-blue-700 transition" onClick={updateAdafruitIO}>Pay</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
