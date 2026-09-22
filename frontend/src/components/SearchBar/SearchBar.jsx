import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";

const SearchBar = ({ value, onChange, handleSearch, onClearSearch }) => {
  return (
    <div className="hidden w-full max-w-md items-center rounded-full border border-cream-300 bg-white/90 py-1.5 pl-4 pr-1.5 shadow-sm transition-all duration-200 focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-citrus-400/50 md:flex">
      <FaMagnifyingGlass className="mr-2.5 shrink-0 text-xs text-ink/35 dark:text-slate-400" />

      <input
        type="text"
        placeholder="Search products in catalogue…"
        className="w-full flex-1 min-w-0 bg-transparent py-1 text-xs font-medium text-ink outline-none placeholder:text-ink/35 dark:text-slate-100 dark:placeholder:text-slate-500"
        value={value}
        onChange={onChange}
      />

      {value && (
        <IoMdClose
          className="ml-2 cursor-pointer text-base text-ink/35 transition-colors hover:text-ink dark:text-slate-400 dark:hover:text-slate-100"
          onClick={onClearSearch}
        />
      )}

      <button
        type="button"
        onClick={handleSearch}
        aria-label="Search"
        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-transform hover:scale-105 hover:bg-brand-700 dark:bg-brand-500"
      >
        <FaMagnifyingGlass className="text-[10px]" />
      </button>
    </div>
  );
};

export default SearchBar;
