import React from "react";
import { MdRemove, MdOutlinePushPin, MdDelete } from "react-icons/md";

const ShoppingCards = ({
    _id,
    Product_name,
    Manufacturer,
    Price, 
    Quantity, 
    weight, 
    onDelete,
    onSubtract
}) => {
    const handleDelete = () => {
        if (!_id) return;
        onDelete(_id);
    };

    return (
        <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-5 bg-white dark:bg-[#122216] hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative flex flex-col justify-between">
            {/* Top row */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h6 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">{Product_name}</h6>
                    <span className="inline-block bg-[#137A24]/10 dark:bg-emerald-950/60 text-[#137A24] dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                        {Manufacturer || "Unknown"}
                    </span>
                </div>

                {/* Monogram Badge */}
                <div className="w-12 h-12 bg-gradient-to-br from-[#E2EFE5] to-[#D4E7D8] dark:from-emerald-900 dark:to-emerald-950 text-[#137A24] dark:text-emerald-300 font-extrabold rounded-2xl border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-base uppercase shrink-0">
                    {Product_name ? Product_name.charAt(0) : 'P'}
                </div>
            </div>

            {/* Total Price section */}
            <div className="mt-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Price</span>
                <span className="text-xl font-extrabold text-[#137A24] dark:text-emerald-400">₹{Price * Number(Quantity)}</span>
            </div>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-[#F0F6F1] dark:bg-[#182d1e] rounded-2xl p-2.5 text-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qty</span>
                    <span className="text-slate-800 dark:text-white text-sm font-extrabold">{Quantity}</span>
                </div>
                <div className="bg-[#F0F6F1] dark:bg-[#182d1e] rounded-2xl p-2.5 text-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weight</span>
                    <span className="text-slate-800 dark:text-white text-sm font-extrabold">{weight}g</span>
                </div>
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between mt-4 pt-2">
                {/* Optional Pin / Bookmark icon */}
                <button className="text-slate-300 hover:text-[#137A24] transition-colors duration-200">
                    <MdOutlinePushPin size={18} />
                </button>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={onSubtract} 
                        className="w-8 h-8 rounded-full bg-[#E2EFE5] text-[#137A24] hover:bg-[#137A24] hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm"
                        title="Subtract Quantity"
                    >
                        <MdRemove size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShoppingCards;