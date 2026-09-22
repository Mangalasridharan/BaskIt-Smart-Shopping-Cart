import { MdRemove } from "react-icons/md";

const ShoppingCards = ({
  Product_name,
  Manufacturer,
  Price,
  Quantity,
  weight,
  onSubtract,
}) => {
  return (
    <article className="group relative flex flex-col justify-between rounded-3xl border border-cream-300/90 bg-cream-50 px-5 py-3.5 sm:px-6 sm:py-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-lift dark:border-white/[0.08] dark:bg-[#0F172A] dark:hover:border-brand-400/30">
      {/* Corner removal control: requires a barcode re-scan */}
      <button
        onClick={onSubtract}
        className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-900/10 bg-slate-900 text-white shadow-md transition-all duration-200 hover:bg-rose-600 active:scale-95 dark:border-white/10 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white"
        title="Scan barcode to remove"
        aria-label="Scan barcode to remove product"
      >
        <MdRemove size={15} />
      </button>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h6 className="truncate font-display text-sm font-bold leading-tight text-ink sm:text-base dark:text-white">
            {Product_name}
          </h6>
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {Manufacturer || "Unknown"}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-ink/40 dark:text-slate-400">Total</span>
          <span className="font-display text-lg font-bold text-brand-600 sm:text-xl dark:text-citrus-400">
            ₹{Price * Number(Quantity)}
          </span>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-xl border border-cream-300/80 bg-cream-100/80 px-3 py-1.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40 dark:text-slate-400">Qty</span>
          <span className="font-mono text-xs font-semibold text-ink sm:text-sm dark:text-slate-200">
            {Quantity}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-cream-300/80 bg-cream-100/80 px-3 py-1.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40 dark:text-slate-400">Weight</span>
          <span className="font-mono text-xs font-semibold text-ink sm:text-sm dark:text-slate-200">
            {weight}g
          </span>
        </div>
      </div>
    </article>
  );
};

export default ShoppingCards;
