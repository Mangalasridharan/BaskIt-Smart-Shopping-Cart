import React, { useState } from 'react'
import ProfileInfo from '../Cards/ProfileInfo';
import {useNavigate} from "react-router-dom";
import SearchBar from '../SearchBar/SearchBar';
import { HiOutlineShoppingCart } from "react-icons/hi";
import ThemeToggle from '../ThemeToggle';

const Navbar = ({userInfo}) => {

    const [searchQuery,setSearchQuery] = useState("");
    const navigate =useNavigate();

    const onLogout = () => {
        localStorage.clear()
        navigate("/login");
    };

    const handleSearch = () => {
        
    };

    const onClearSearch = () => {
        setSearchQuery("");
    };

    return(
        <div className="bg-white dark:bg-slate-900 border-b border-[#137A24]/10 dark:border-slate-800 flex items-center justify-between px-6 py-4 shadow-sm sticky top-0 z-50 transition-colors">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                <div className="w-10 h-10 bg-[#E2EFE5] dark:bg-emerald-950/60 rounded-xl flex items-center justify-center text-[#137A24] dark:text-emerald-400">
                    <HiOutlineShoppingCart className="text-xl" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[#16331C] dark:text-white tracking-tight">
                        Bask<span className="text-[#137A24] dark:text-emerald-400">It</span>
                    </h2>
                </div>
            </div>

            <SearchBar 
                value={searchQuery}
                onChange={({ target }) => {
                    setSearchQuery(target.value);
                }}
                handleSearch={handleSearch}
                onClearSearch={onClearSearch}
            />

            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate("/admin")}
                    className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl transition-colors hidden sm:block"
                >
                    📦 Inventory (Admin)
                </button>
                <ThemeToggle />
                <ProfileInfo userInfo={userInfo} onLogout ={onLogout} />
            </div>
            
        </div>
    )
}

export default Navbar