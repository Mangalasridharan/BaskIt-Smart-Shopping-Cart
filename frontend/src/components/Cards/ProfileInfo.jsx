import { getInitials } from "../../utils/helper";
import { normalizeRole, ROLE_LABELS } from "../../utils/constants";
import { HiOutlineLogout } from "react-icons/hi";

const ProfileInfo = ({ userInfo, onLogout, variant = "light" }) => {
  if (!userInfo) return null;

  const role = normalizeRole(userInfo.role);
  const onInk = variant === "dark";

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl font-display text-sm font-bold shadow-soft ${
            onInk
              ? "bg-citrus-400 text-slate-900"
              : "bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo"
          }`}
        >
          {getInitials(userInfo.fullName)}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 bg-emerald-500 ${
            onInk
              ? "border-ink"
              : "border-cream-50 dark:border-[#0F172A]"
          }`}
        />
      </div>

      <div className="hidden sm:block">
        <p
          className={`font-display text-sm font-semibold leading-tight ${
            onInk ? "text-cream-100" : "text-ink dark:text-slate-100"
          }`}
        >
          {userInfo.fullName}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
              onInk
                ? "bg-citrus-400/20 text-citrus-300"
                : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
            }`}
          >
            {ROLE_LABELS[role]}
          </span>
          <button
            className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
              onInk
                ? "text-cream-100/45 hover:text-red-400"
                : "text-ink/45 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
            }`}
            onClick={onLogout}
          >
            <HiOutlineLogout className="text-xs" />
            Logout
          </button>
        </div>
      </div>

      <button
        className={`rounded-full border p-2 transition-colors sm:hidden ${
          onInk
            ? "border-white/10 text-cream-100/50 hover:text-red-400"
            : "border-cream-300 text-ink/50 hover:text-red-500 dark:border-white/10 dark:text-slate-400 dark:hover:text-red-400"
        }`}
        onClick={onLogout}
        aria-label="Logout"
      >
        <HiOutlineLogout className="text-base" />
      </button>
    </div>
  );
};

export default ProfileInfo;
