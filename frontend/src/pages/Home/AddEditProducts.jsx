import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";

const AddEditProducts = ({ productData, refreshProducts, closeModal }) => {
  const [formData, setFormData] = useState({
    product_name: "",
    Manufacturer: "",
    Price: "",
    Quantity: "",
    weight: "",
  });

  const [isAdding, setIsAdding] = useState(false);

  // Populate form when editing an existing product
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...(productData || {
        product_name: "",
        Manufacturer: "",
        Price: "",
        Quantity: "",
        weight: "",
      }),
    }));
  },[productData]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAdding(true);
  
    try {
      const endpoint = productData ? "/update-product" : "/add-product";
      const response = await axiosInstance.post(endpoint, formData);
      console.log("✅ Product Action Successful:", response.data);
  
      if (response.data.success) {
        await refreshProducts(); // Ensure state updates before closing modal
        closeModal();
      }
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold mb-4">{productData ? "Edit Product" : "Add Product"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="product_name"
          placeholder="Product Name"
          value={formData.product_name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="text"
          name="Manufacturer"
          placeholder="Manufacturer"
          value={formData.Manufacturer}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="number"
          name="Price"
          placeholder="Price"
          value={formData.Price}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="number"
          name="Quantity"
          placeholder="Quantity"
          value={formData.Quantity}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="number"
          name="weight"
          placeholder="Weight (kg)"
          value={formData.weight}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          disabled={isAdding}
        >
          {isAdding ? "Processing..." : productData ? "Update Product" : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default AddEditProducts;