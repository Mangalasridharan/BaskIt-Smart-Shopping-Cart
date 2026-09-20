import { HiOutlineSun, HiOutlineMoon } from "react-icons/hi";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle Light / Dark Mode"
      aria-pressed={isDark}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`relative inline-flex h-10 w-[78px] shrink-0 items-center rounded-full border border-cream-300 bg-cream-100 p-1 shadow-inner transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/80 ${className}`}
    >
      {/* Background track icons anchored at the far ends */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5">
        <HiOutlineSun className="h-4 w-4 text-amber-500/80 dark:text-slate-600" />
        <HiOutlineMoon className="h-4 w-4 text-slate-400 dark:text-citrus-300/80" />
      </div>

      {/* Sliding knob */}
      <span
        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
          isDark
            ? "translate-x-[38px] bg-gradient-to-tr from-brand-600 to-citrus-400 text-slate-950 shadow-citrus"
            : "translate-x-0 bg-white text-amber-500 shadow-soft"
        }`}
      >
        {isDark ? (
          <HiOutlineMoon className="h-4 w-4 text-slate-950" />
        ) : (
          <HiOutlineSun className="h-4 w-4 text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
