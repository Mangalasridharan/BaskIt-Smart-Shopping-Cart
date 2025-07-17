import React from "react";
import { MdCreate, MdOutlinePushPin } from "react-icons/md";
import { MdDelete } from "react-icons/md";

const ShoppingCards = ({
    _id,
    Product_name,
    Manufacturer,
    Price, 
    Quantity, 
    weight, 
    onDelete,
    onEdit
}) => {
    const handleDelete = () => {
        if (!_id) return;
        // Let parent component handle the API call
        onDelete(_id);
    };

    return (
        <div className="border rounded p-4 bg-white hover:shadow-xl transition-all ease-in-out relative">
            <div className="flex items-center justify-between">
                <div>
                    <h6 className="text-sm font-bold">{Product_name}</h6>
                    <span className="text-xs text-slate-500">{Manufacturer}</span>
                </div>

                <button
                    className={`absolute top-2 right-2 `}
                >
                    <MdOutlinePushPin size={20} />
                </button>

                <div className="w-12 h-12 bg-gray-200 rounded-full absolute -top-4 -right-4 border-2 border-white shadow-md flex items-center justify-center text-gray-400 text-xs">
                    I
                </div>
            </div>

            <p className="text-xs text-slate-600 mt-2">Price: Rs.{Price * Number(Quantity)}</p>
            <p className="text-xs text-slate-600 mt-1">Weight: {weight}g</p>
            
            <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-slate-500">Quantity: {Quantity}</div>

                <div className="flex items-center gap-2">
                    <MdCreate 
                        className="icon-btn hover:text-green-600 cursor-pointer" 
                        onClick={onEdit} 
                    />
                    <MdDelete 
                        className="icon-btn hover:text-red-500 cursor-pointer" 
                        onClick={handleDelete} 
                    />
                </div>
            </div>
        </div>
    );
};

export default ShoppingCards;