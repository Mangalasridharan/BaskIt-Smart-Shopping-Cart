import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileInfo from "../Cards/ProfileInfo";
import SearchBar from "../SearchBar/SearchBar";
import ThemeToggle from "../ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole, ROLES } from "../../utils/constants";
import { HiOutlineShoppingBag } from "react-icons/hi";

const Navbar = ({ userInfo }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearch = () => {};

  const onClearSearch = () => {
    setSearchQuery("");
  };

  const isShopkeeper = normalizeRole(userInfo?.role) === ROLES.SHOPKEEPER;

  return (
    <header className="sticky top-0 z-50 border-b border-cream-300/80 bg-cream-100/85 backdrop-blur-xl transition-colors dark:border-white/[0.08] dark:bg-[#090D16]/85">
      <div className="flex h-[72px] w-full items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
        <div className="flex flex-1 items-center justify-start">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo transition-transform group-hover:scale-105">
              <HiOutlineShoppingBag className="text-lg" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-bold tracking-tight text-ink dark:text-white">
                Bask<span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-citrus-400 bg-clip-text text-transparent">It</span>
              </span>
              <span className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.22em] text-ink/40 dark:text-slate-400 sm:block">
                Smart Retail
              </span>
            </span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <SearchBar
            value={searchQuery}
            onChange={({ target }) => {
              setSearchQuery(target.value);
            }}
            handleSearch={handleSearch}
            onClearSearch={onClearSearch}
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2.5">
          {isShopkeeper && (
            <button
              onClick={() => navigate("/inventory")}
              className="hidden items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-3.5 py-2 text-[11px] font-semibold text-ink/70 transition-all hover:border-brand-500/40 hover:text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-citrus-400 sm:flex"
            >
              📦 Inventory
            </button>
          )}
          <ThemeToggle />
          <ProfileInfo userInfo={userInfo} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
