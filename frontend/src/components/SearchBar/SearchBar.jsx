import React from "react"
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";

const SearchBar = ({value, onChange, handleSearch, onClearSearch}) => {
    return (
        <div className="w-80 flex items-center px-5 bg-[#F0F6F1] rounded-full focus-within:ring-2 focus-within:ring-[#137A24]/20 transition-all duration-200">
            <input 
                type="text"
                placeholder = "Search Products"
                className="w-full text-xs bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none font-medium"
                value={value}
                onChange={onChange}
            />

            { value &&(
                <IoMdClose 
                    className="text-xl text-slate-400 cursor-pointer hover:text-slate-600 mr-3" 
                    onClick={onClearSearch} 
                />
            )}

            <FaMagnifyingGlass 
                className="text-slate-400 cursor-pointer hover:text-[#137A24] transition-colors" 
                onClick={handleSearch} 
            />
        </div>
    );
};

export default SearchBar