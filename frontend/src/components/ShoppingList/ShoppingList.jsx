import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineClipboardList,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh,
} from "react-icons/hi";
import { useGoogleOAuth, useGoogleLogin } from "@react-oauth/google";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../../context/AuthContext";

// Home dispatches this after a successful scan so a matching list item is
// ticked off automatically.
export const SHOPPING_LIST_SCAN_EVENT = "baskit:shopping-list:scanned";

const STORAGE_PREFIX = "baskit.shoppingList";

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const GoogleNotesActiveSyncButton = ({ onItemsSynced, setSyncFeedback }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerGoogleSync = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSyncing(true);
      setSyncFeedback(null);
      try {
        const response = await axiosInstance.post("/shopping-list/sync-google", {
          accessToken: tokenResponse.access_token,
        });

        const syncedItems = response.data?.items || [];
        if (syncedItems.length > 0) {
          onItemsSynced(syncedItems);
          setSyncFeedback({
            success: true,
            message: `Synced ${syncedItems.length} item(s) from ${
              response.data.source || "Google Notes"
            }!`,
          });
        } else {
          setSyncFeedback({
            success: false,
            message: "No checklist or note items found in your Google account.",
          });
        }
      } catch (err) {
        console.error("Failed to sync from Google Notes:", err);
        setSyncFeedback({
          success: false,
          message:
            err.response?.data?.message ||
            "Failed to sync shopping list from Google Notes.",
        });
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      setIsSyncing(false);
      setSyncFeedback({
        success: false,
        message: "Google authorization was cancelled or failed.",
      });
      setTimeout(() => setSyncFeedback(null), 6000);
    },
    scope: "https://www.googleapis.com/auth/tasks.readonly",
  });

  return (
    <button
      type="button"
      onClick={() => triggerGoogleSync()}
      disabled={isSyncing}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-white py-2 px-3.5 text-xs font-semibold text-ink shadow-soft transition-all hover:bg-cream-100/70 hover:border-ink/20 active:scale-[0.99] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-cream-100 dark:hover:bg-white/[0.08]"
    >
      {isSyncing ? (
        <HiOutlineRefresh className="animate-spin text-sm" />
      ) : (
        <GoogleIcon />
      )}
      <span>
        {isSyncing ? "Syncing from Google Tasks…" : "Sync list from Google Tasks"}
      </span>
    </button>
  );
};

const GoogleNotesSyncButton = ({ onItemsSynced, setSyncFeedback }) => {
  let clientId = "";
  try {
    const oauth = useGoogleOAuth();
    clientId = oauth?.clientId || "";
  } catch {
    clientId = "";
  }

  // Safe fallback: never invoke useGoogleLogin if Client ID is missing/dummy
  if (!clientId || clientId === "not-configured" || clientId === "google-client-id-placeholder") {
    return (
      <button
        type="button"
        onClick={() => {
          setSyncFeedback({
            success: false,
            message:
              "Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID to your frontend .env file to sync.",
          });
          setTimeout(() => setSyncFeedback(null), 6000);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cream-300 bg-white py-2 px-3.5 text-xs font-semibold text-ink shadow-soft transition-all hover:bg-cream-100/70 hover:border-ink/20 active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.04] dark:text-cream-100 dark:hover:bg-white/[0.08]"
      >
        <GoogleIcon />
        <span>Sync shopping list from Google Notes</span>
      </button>
    );
  }

  return (
    <GoogleNotesActiveSyncButton
      onItemsSynced={onItemsSynced}
      setSyncFeedback={setSyncFeedback}
    />
  );
};

const createId = () => {
  try {
    return window.crypto.randomUUID();
  } catch {
    return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Loose match so "Milk" ticks off when "Amul Milk 500ml" is scanned.
const looksLike = (itemText, productName) => {
  const item = normalizeText(itemText);
  const product = normalizeText(productName);

  if (!item || !product) return false;
  if (item === product) return true;
  if (item.length >= 3 && product.includes(item)) return true;
  if (product.length >= 3 && item.includes(product)) return true;

  const tokens = item.split(" ").filter((token) => token.length > 2);
  return tokens.length > 0 && tokens.every((token) => product.includes(token));
};

const sanitizeItems = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item.text === "string" && item.text.trim())
    .map((item) => ({
      id: item.id ? String(item.id) : createId(),
      text: item.text.trim(),
      done: Boolean(item.done),
      createdAt: Number(item.createdAt) || Date.now(),
    }));
};

const ShoppingList = () => {
  const { user } = useAuth();
  const storageKey = `${STORAGE_PREFIX}.${
    user?._id || user?.id || user?.email || "guest"
  }`;

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const [draft, setDraft] = useState("");

  const inputRef = useRef(null);

  /* ------------------------------- persistence ------------------------------ */

  useEffect(() => {
    let parsed = [];

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) parsed = sanitizeItems(JSON.parse(raw));
    } catch {
      parsed = [];
    }

    setItems(parsed);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    // Don't overwrite another user's list before this user's list has loaded.
    if (loadedKey !== storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* storage can be unavailable */
    }
  }, [items, loadedKey, storageKey]);

  /* --------------------------------- actions -------------------------------- */

  const addItem = useCallback(
    (rawText) => {
      const text = String(rawText || "").trim();
      if (!text) return;

      setItems((current) => [
        ...current,
        { id: createId(), text, done: false, createdAt: Date.now() },
      ]);
      setDraft("");
    },
    []
  );

  const toggleItem = useCallback((id) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((current) => current.filter((item) => !item.done));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    addItem(draft);
    inputRef.current?.focus();
  };

  /* ---------------------- Google Notes / Tasks sync ------------------------- */

  const [syncFeedback, setSyncFeedback] = useState(null);

  const handleItemsSynced = useCallback((newItems) => {
    setItems((currentItems) => {
      const existingNormalized = new Set(
        currentItems.map((item) => normalizeText(item.text))
      );
      const uniqueNew = newItems.filter(
        (item) => !existingNormalized.has(normalizeText(item.text))
      );
      return [...currentItems, ...uniqueNew];
    });
  }, []);

  /* ----------------------------- scan integration --------------------------- */

  useEffect(() => {
    const handleScanned = (event) => {
      const productName = String(event.detail?.productName || "").trim();
      if (!productName) return;

      setItems((current) => {
        const match = current.find(
          (item) => !item.done && looksLike(item.text, productName)
        );
        if (!match) return current;

        return current.map((item) =>
          item.id === match.id ? { ...item, done: true } : item
        );
      });
    };

    window.addEventListener(SHOPPING_LIST_SCAN_EVENT, handleScanned);
    return () =>
      window.removeEventListener(SHOPPING_LIST_SCAN_EVENT, handleScanned);
  }, []);

  /* ------------------------------ drawer chrome ----------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 150);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  /* --------------------------------- derived -------------------------------- */

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.createdAt - b.createdAt;
      }),
    [items]
  );

  const pending = sorted.filter((item) => !item.done);
  const completed = sorted.filter((item) => item.done);
  const total = items.length;
  const doneCount = completed.length;
  const remaining = pending.length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  /* --------------------------------- render --------------------------------- */

  return (
    <>
      {/* Side tab */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open shopping list${
          remaining ? ` (${remaining} item${remaining === 1 ? "" : "s"} to buy)` : ""
        }`}
        className="group fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-white/20 bg-gradient-to-b from-brand-600 to-indigo-700 px-2.5 py-4 text-white shadow-indigo transition-all duration-200 hover:pr-3.5 active:scale-95"
      >
        <span className="relative">
          <HiOutlineClipboardList className="text-2xl" />
          {remaining > 0 && (
            <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-citrus-400 px-1 text-[9px] font-bold text-slate-950 shadow-citrus">
              {remaining > 9 ? "9+" : remaining}
            </span>
          )}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.18em]">
          List
        </span>
      </button>

      {/* Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping list"
        >
          <div
            className="absolute inset-0 animate-fade-in bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <aside className="relative flex h-full w-full max-w-sm animate-slide-in-right flex-col border-l border-cream-300 bg-cream-50 shadow-lift dark:border-white/[0.08] dark:bg-[#0F172A]">
            {/* Header */}
            <header className="border-b border-cream-300/80 bg-slate-900 px-5 pb-5 pt-5 text-white dark:border-white/[0.08] dark:bg-[#090D16]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-citrus-400 text-2xl text-white shadow-citrus">
                    <HiOutlineClipboardList />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold leading-tight">
                      Shopping list
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {total === 0
                        ? "Plan what to pick up in-store"
                        : `${doneCount} of ${total} done${
                            remaining
                              ? ` · ${remaining} to buy`
                              : " · all done"
                          }`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close shopping list"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <HiOutlineX className="text-xl" />
                </button>
              </div>

              {total > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-citrus-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </header>

            {/* Sync from Google Notes button */}
            <div className="px-5 pt-3">
              <GoogleNotesSyncButton
                onItemsSynced={handleItemsSynced}
                setSyncFeedback={setSyncFeedback}
              />
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`mx-5 mt-2 flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium animate-fade-in ${
                  syncFeedback.success
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                <span>{syncFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setSyncFeedback(null)}
                  className="ml-2 text-xs opacity-60 hover:opacity-100"
                >
                  <HiOutlineX />
                </button>
              </div>
            )}

            {/* Add item */}
            <form onSubmit={handleSubmit} className="px-5 py-4">
              <div className="flex items-center gap-2 rounded-full border border-cream-300 bg-white px-3 py-1.5 shadow-sm transition-colors focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/10 dark:bg-white/[0.04]">
                <HiOutlinePlus className="shrink-0 text-lg text-ink/35 dark:text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Add an item (e.g. Milk)"
                  maxLength={120}
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-medium text-ink outline-none placeholder:text-ink/35 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="shrink-0 rounded-full bg-brand-600 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-brand-500 dark:disabled:bg-white/10 dark:disabled:text-white/30"
                >
                  Add
                </button>
              </div>
            </form>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {total === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-3xl text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <HiOutlineClipboardList />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-ink dark:text-slate-100">
                    Your list is empty
                  </h3>
                  <p className="mt-1 max-w-[230px] text-xs leading-relaxed text-ink/50 dark:text-slate-400">
                    Add the things you need. Tick them off as you shop — scanning a
                    matching product does it for you.
                  </p>
                </div>
              ) : (
                <>
                  <section>
                    <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
                      <h3 className="micro">To buy</h3>
                      <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-ink/50 dark:bg-white/10 dark:text-cream-100/50">
                        {remaining}
                      </span>
                    </div>

                    {pending.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-ink/40 dark:text-cream-100/40">
                        Nothing left to buy — everything is in the cart.
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {pending.map((item) => (
                          <li
                            key={item.id}
                            className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-cream-100/80 dark:hover:bg-white/[0.05]"
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={false}
                              aria-label={`Mark ${item.text} as done`}
                              onClick={() => toggleItem(item.id)}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-cream-400 text-transparent transition-colors hover:border-brand-500 dark:border-white/25 dark:hover:border-citrus-400"
                            >
                              <HiOutlineCheck className="text-xs" />
                            </button>

                            <span className="min-w-0 flex-1 break-words text-sm text-ink/80 dark:text-cream-100/85">
                              {item.text}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Delete ${item.text}`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/25 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 dark:text-cream-100/25 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <HiOutlineTrash className="text-sm" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {completed.length > 0 && (
                    <section className="mt-4">
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <h3 className="micro">Completed</h3>
                        <button
                          type="button"
                          onClick={clearCompleted}
                          className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35 transition-colors hover:text-red-500 dark:text-cream-100/35 dark:hover:text-red-400"
                        >
                          Clear
                        </button>
                      </div>

                      <ul className="space-y-0.5">
                        {completed.map((item) => (
                          <li
                            key={item.id}
                            className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-cream-100/80 dark:hover:bg-white/[0.05]"
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked
                              aria-label={`Mark ${item.text} as not done`}
                              onClick={() => toggleItem(item.id)}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white transition-colors dark:bg-citrus-400 dark:text-ink"
                            >
                              <HiOutlineCheck className="text-xs" />
                            </button>

                            <span className="min-w-0 flex-1 break-words text-sm text-ink/35 line-through dark:text-cream-100/35">
                              {item.text}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Delete ${item.text}`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/25 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 dark:text-cream-100/25 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            >
                              <HiOutlineTrash className="text-sm" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-cream-300/80 px-5 py-4 dark:border-white/10">
              <p className="text-[10px] leading-relaxed text-ink/40 dark:text-cream-100/40">
                Items check off automatically when you scan a matching product.
                Your list is saved on this device.
              </p>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
};

export default ShoppingList;
