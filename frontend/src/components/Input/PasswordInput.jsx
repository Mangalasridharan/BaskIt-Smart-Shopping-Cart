import { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [isShowPassword, setIsShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setIsShowPassword(!isShowPassword);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center rounded-2xl border border-cream-300 bg-white px-4 py-3.5 transition-all duration-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-citrus-400/70 dark:focus-within:ring-citrus-400/10">
        <input
          value={value}
          onChange={onChange}
          type={isShowPassword ? "text" : "password"}
          placeholder={placeholder || "Enter Password"}
          className="w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink/35 dark:text-slate-100 dark:placeholder:text-slate-500"
        />

        <button
          type="button"
          onClick={toggleShowPassword}
          aria-label={isShowPassword ? "Hide password" : "Show password"}
          className="ml-2 shrink-0 text-ink/35 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-citrus-400"
        >
          {isShowPassword ? <FaRegEye size={17} /> : <FaRegEyeSlash size={17} />}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;
