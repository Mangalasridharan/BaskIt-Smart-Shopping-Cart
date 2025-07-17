const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
    product_name: { type: String, required: true },
    Manufacturer: { type: String, required: true },
    Price: { type: Number, required: true }, // ✅ Ensure Price is a Number
    Quantity: { type: Number, required: true }, // ✅ Ensure Quantity is a Number
    weight: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }

});

module.exports = mongoose.model("Product",productSchema);

//Product_name, 
//Manufacturer, 
//Price, 
//Quantity,
//weight, 
//onDelete,
//onEdit,
//isPinned,
//onPinProduct