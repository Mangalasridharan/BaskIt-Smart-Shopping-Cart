import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  HiOutlineShoppingCart,
  HiOutlineQrcode,
  HiOutlineCamera,
  HiOutlineReceiptTax,
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineAdjustments,
  HiArrowRight,
  HiX,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome, normalizeRole, ROLES } from "../../utils/constants";
import ThemeToggle from "../../components/ThemeToggle";

const FEATURES = [
  {
    icon: HiOutlineCamera,
    title: "Scan as you shop",
    body: "Every product barcode is scanned with instant camera recognition the moment it goes in.",
    index: "01",
  },
  {
    icon: HiOutlineReceiptTax,
    title: "Watch the bill build",
    body: "Products, quantities and the running total stay in sync in real time.",
    index: "02",
  },
  {
    icon: HiOutlineRefresh,
    title: "Change your mind",
    body: "Re-scan an item to remove it from your cart. No cashier, no awkward walk-back.",
    index: "03",
  },
  {
    icon: HiOutlineCreditCard,
    title: "Pay, then walk",
    body: "Stripe handles the payment. A single-use QR pass opens the exit barrier.",
    index: "04",
  },
];

const STEPS = [
  {
    icon: HiOutlineQrcode,
    title: "Start your cart",
    body: "Scan the store QR, then the cart QR, and a live session is bound to your basket.",
  },
  {
    icon: HiOutlineCamera,
    title: "Scan products",
    body: "Point your camera at item barcodes as you shop — no queue, no conveyor.",
  },
  {
    icon: HiOutlineReceiptTax,
    title: "Build your bill",
    body: "Price, details and stock are fetched instantly. Your total updates with every scan.",
  },
  {
    icon: HiOutlineRefresh,
    title: "Review & modify",
    body: "Remove anything by re-scanning its barcode with instant cart recalculation.",
  },
  {
    icon: HiOutlineCreditCard,
    title: "Pay with Stripe",
    body: "One tap opens Stripe's hosted checkout. Cards never touch the cart.",
  },
  {
    icon: HiOutlineCheckCircle,
    title: "Exit the gate",
    body: "Show the payment QR to the barrier. Adafruit IO pulses the servo and lets you out.",
  },
];

const TECH = [
  { icon: "📷", title: "Smart Barcode Engine", body: "High-speed camera barcode and QR recognition powered by Dynamsoft & ZXing." },
  { icon: "⚡", title: "Real-time Processing", body: "Barcodes are decoded instantly to keep scanning smooth and responsive." },
  { icon: "🔄", title: "Live sync", body: "Cart state and billing are mirrored to MongoDB Atlas in real time." },
  { icon: "🛒", title: "Session Telemetry", body: "Dynamic cart-to-session pairing tracks active items and running totals." },
  { icon: "🔐", title: "Payment-gated exit", body: "Adafruit IO pulses a servo barrier only after Stripe confirms." },
];

const WHY = [
  { icon: "⏱️", title: "Less waiting", body: "Billing moves into the aisle instead of the checkout queue." },
  { icon: "👁️", title: "Real-time clarity", body: "Shoppers see exactly what they're spending before the exit." },
  { icon: "🎯", title: "Accurate billing", body: "Live barcode verification and synchronized totals eliminate discrepancies." },
  { icon: "🛠️", title: "Operational control", body: "Shopkeepers manage catalogue, stock and pricing from one console." },
];

const FLOW = [
  "Customer",
  "Scan cart QR",
  "Smart cart",
  "Scan barcode",
  "Product service",
  "Live bill",
  "Stripe",
  "Payment verified",
  "Exit gate",
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, login, register, logout } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const openDemoModal = () => {
    setErrorMsg("");
    setIsAuthModalOpen(true);
  };

  const closeModal = () => {
    setIsAuthModalOpen(false);
    setErrorMsg("");
  };

  // 1-Click instant demo login
  const handleQuickDemoLogin = async (userRole = ROLES.CUSTOMER) => {
    setLoading(true);
    setErrorMsg("");

    const isShopkeeper = normalizeRole(userRole) === ROLES.SHOPKEEPER;
    const demoAccount = isShopkeeper
      ? {
          fullName: "Demo Shopkeeper",
          email: "shopkeeper@baskit.com",
          password: "shopkeeper@123",
          role: ROLES.SHOPKEEPER,
        }
      : {
          fullName: "Demo Shopper",
          email: "shopper@baskit.com",
          password: "shopper@123",
          role: ROLES.CUSTOMER,
        };

    try {
      let user;
      try {
        user = await login(demoAccount.email, demoAccount.password);
      } catch (loginError) {
        try {
          user = await register(demoAccount);
        } catch {
          throw loginError;
        }
      }

      if (isShopkeeper && normalizeRole(user.role) !== ROLES.SHOPKEEPER) {
        logout();
        setErrorMsg("This demo account belongs to a customer. Use the customer demo instead.");
        return;
      }

      navigate(getRoleHome(user.role), { replace: true });
    } catch (error) {
      console.error("Demo login error:", error);
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          "Failed to start demo session. Please try regular login."
      );
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream-100 font-sans text-ink transition-colors duration-300 dark:bg-[#090D16] dark:text-slate-100">
      {/* ============================== NAVBAR ============================== */}
      <nav className="sticky top-0 z-40 border-b border-cream-300/70 bg-cream-100/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#090D16]/80">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group flex items-center gap-3 transition-transform active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo transition-transform group-hover:scale-105">
              <HiOutlineShoppingCart className="text-lg" />
            </span>
            <span className="text-left leading-none">
              <span className="block font-display text-xl font-bold tracking-tight text-ink dark:text-white">
                Bask<span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-citrus-400 bg-clip-text text-transparent">It</span>
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.22em] text-ink/40 dark:text-slate-400">
                Smart Retail
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-7 text-[13px] font-medium text-ink/65 dark:text-slate-300 lg:flex">
            {[
              ["features", "Features"],
              ["how-it-works", "How it works"],
              ["technology", "Technology"],
              ["architecture", "Architecture"],
              ["why-baskit", "Why BaskIt"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="transition-colors hover:text-brand-600 dark:hover:text-citrus-400"
              >
                {label}
              </button>
            ))}
            <Link
              to="/inventory"
              className="flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5 text-[11px] font-semibold text-ink/70 transition-all hover:border-brand-500/30 hover:text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-citrus-400"
            >
              <HiOutlineAdjustments /> Shopkeeper
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {user ? (
              <button
                onClick={() => navigate(getRoleHome(user.role))}
                className="btn-primary group"
              >
                <span className="hidden sm:inline">
                  {normalizeRole(user.role) === ROLES.SHOPKEEPER
                    ? "Shopkeeper Dashboard"
                    : "My Basket"}
                </span>
                <span className="sm:hidden">Basket</span>
                <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink/70 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-citrus-400 sm:block"
                >
                  Sign in
                </button>
                <button onClick={openDemoModal} className="btn-primary group shadow-indigo">
                  <span>Try demo</span>
                  <HiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* =============================== HERO =============================== */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-32 top-10 h-[26rem] w-[26rem] rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-500/20" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-citrus-400/15 blur-3xl dark:bg-citrus-400/20" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-20 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="pill-lime animate-fade-in-up">
                <HiOutlineSparkles className="text-sm" />
                Autonomous checkout, live today
              </span>

              <h1 className="mt-6 font-display text-[2.7rem] font-bold leading-[1.02] tracking-tight sm:text-[3.6rem] lg:text-[4.3rem]">
                Skip the queue.
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">Keep the shopping.</span>
                  <span className="absolute inset-x-0 bottom-1.5 z-0 h-3 rounded-full bg-gradient-to-r from-citrus-400/40 via-brand-500/40 to-citrus-300/40 sm:h-4 dark:from-citrus-400/30 dark:to-brand-400/30" />
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/60 dark:text-slate-300 sm:text-lg">
                BaskIt turns the shopping cart into the checkout. Scan products as
                you shop, watch your bill build live, pay with Stripe, and open the
                exit barrier with a single QR pass.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={openDemoModal} className="btn-primary group px-7 py-4 text-base shadow-indigo">
                  <HiOutlineShoppingCart className="text-lg" />
                  Try the live demo
                  <HiArrowRight className="transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="btn-ghost px-7 py-4 text-base"
                >
                  See how it works
                </button>
              </div>

              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-cream-300/80 pt-6 dark:border-white/10">
                {[
                  ["0 min", "Queue time"],
                  ["<400ms", "Scan latency"],
                  ["100%", "Digital checkout"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="font-display text-xl font-bold sm:text-2xl text-brand-600 dark:text-citrus-400">
                      {value}
                    </div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-ink/40 dark:text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live cart terminal */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                <div className="absolute -inset-3 -rotate-2 rounded-[2.5rem] border border-cream-300/70 bg-cream-50/40 dark:border-white/5 dark:bg-white/[0.02]" />

                <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-800 bg-slate-900/95 text-white shadow-lift backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0F172A]">
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse-ring rounded-full bg-citrus-400" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                        Cart 04 · live
                      </span>
                    </div>
                    <span className="rounded-full border border-citrus-400/30 bg-citrus-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-citrus-300">
                      Scanner ready
                    </span>
                  </div>

                  <div className="space-y-2.5 px-4 py-5">
                    {[
                      { emoji: "🍜", name: "Maggi 2-Minute Noodles", meta: "Qty 2 · Pack of 2 · Nestlé", price: "₹28" },
                      { emoji: "☕", name: "Nescafé Classic", meta: "Qty 1 · 25g Jar · Nestlé", price: "₹90" },
                      { emoji: "🍫", name: "Dark Fantasy", meta: "Qty 1 · Choco Fills · ITC", price: "₹30" },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.05] px-3.5 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base">
                            {item.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.meta}</div>
                          </div>
                        </div>
                        <div className="ml-3 shrink-0 text-sm font-bold text-citrus-300 font-mono">
                          {item.price}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mx-4 mb-4 rounded-2xl border border-citrus-400/20 bg-citrus-400/[0.07] p-4">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em]">
                      <span className="flex items-center gap-1.5 text-citrus-300">
                        <HiOutlineCheckCircle className="text-sm" /> Basket status
                      </span>
                      <span className="text-slate-300">Synchronized · 4 items</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-500 to-citrus-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 px-6 py-5">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Live total
                      </div>
                      <div className="font-display text-2xl font-bold text-citrus-400">
                        ₹148.00
                      </div>
                    </div>
                    <button
                      onClick={openDemoModal}
                      className="rounded-full bg-citrus-400 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-citrus transition-all hover:bg-citrus-300 active:scale-95"
                    >
                      Open cart →
                    </button>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 rotate-[-4deg] rounded-2xl border border-cream-300 bg-white px-3.5 py-2 shadow-soft dark:border-white/10 dark:bg-[#0F172A]">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-citrus-300">
                    ⚡ Stripe verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== MARQUEE ============================== */}
      <div className="overflow-hidden border-y border-ink/10 bg-ink py-3.5 text-cream-100 dark:border-white/10">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-8">
              {[
                "Scan as you shop",
                "Live bill",
                "Barcode-gated removal",
                "Stripe checkout",
                "QR exit pass",
                "Adafruit gate",
                "Instant checkout",
              ].map((word) => (
                <span
                  key={`${copy}-${word}`}
                  className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/60"
                >
                  {word}
                  <span className="text-citrus-400">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ============================== FEATURES ============================== */}
      <section id="features" className="bg-cream-50 py-20 dark:bg-[#0D1322] md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <span className="eyebrow">01 — Shopping, rebuilt</span>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl text-ink dark:text-white">
                Shopping without the checkout queue.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-ink/60 dark:text-slate-400 lg:col-span-4 lg:text-base">
              Every cart is bound to a unique digital session. The moment a product
              is scanned, the bill and stock ledger update together.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body, index }, i) => (
              <article
                key={title}
                className={`group relative overflow-hidden rounded-4xl border border-cream-300/90 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-white/[0.08] ${
                  i === 0
                    ? "bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-indigo"
                    : "bg-cream-100 dark:bg-[#0F172A]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                      i === 0
                        ? "bg-white/15 text-white"
                        : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                    }`}
                  >
                    <Icon />
                  </span>
                  <span
                    className={`font-display text-xs font-bold tracking-[0.12em] ${
                      i === 0 ? "text-white/60" : "text-ink/25 dark:text-slate-500"
                    }`}
                  >
                    {index}
                  </span>
                </div>
                <h3 className="mt-7 font-display text-lg font-semibold">{title}</h3>
                <p
                  className={`mt-2 text-[13px] leading-relaxed ${
                    i === 0 ? "text-white/80" : "text-ink/55 dark:text-slate-400"
                  }`}
                >
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section id="how-it-works" className="relative bg-cream-100 py-20 dark:bg-[#090D16] md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow">02 — The flow</span>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-ink dark:text-white">
                Six steps. Zero queue.
              </h2>
            </div>
            <span className="pill w-fit">Cart → Stripe → Gate</span>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-0 md:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="group flex gap-5 border-t border-cream-300/90 py-7 dark:border-white/[0.08]"
              >
                <span className="font-display text-xs font-bold text-ink/30 dark:text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base text-brand-600 shadow-soft transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-white/5 dark:text-citrus-400 dark:group-hover:bg-citrus-400 dark:group-hover:text-slate-950">
                      <Icon />
                    </span>
                    <h3 className="font-display text-base font-semibold">{title}</h3>
                  </div>
                  <p className="mt-2 pl-12 text-[13px] leading-relaxed text-ink/55 dark:text-slate-400">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-4xl bg-slate-900 border border-slate-800 px-8 py-8 text-white sm:px-10 dark:bg-[#0F172A] dark:border-white/[0.08]">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="max-w-xl font-display text-lg font-semibold sm:text-xl">
                No long checkout queue. No manual bill calculation.
              </p>
              <span className="pill-lime shrink-0 border-citrus-400/30 bg-citrus-400/10 text-citrus-300">
                ✦ Built for real stores
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= TECHNOLOGY ============================= */}
      <section id="technology" className="bg-cream-50 py-20 dark:bg-[#0D1322] md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow">03 — Hardware & edge</span>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl text-ink dark:text-white">
              Built for real-time shopping.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/60 dark:text-slate-400 sm:text-base">
              BaskIt pairs IoT hardware and edge processing with a central backend so
              the cart never waits for the cloud to catch up.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH.map(({ icon, title, body }, i) => (
              <article
                key={title}
                className={`rounded-4xl border border-cream-300/90 bg-cream-100 p-7 transition-all hover:border-brand-500/30 hover:shadow-soft dark:border-white/[0.08] dark:bg-[#0F172A] ${
                  i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="text-2xl">{icon}</div>
                <h3 className="mt-5 font-display text-base font-semibold">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink/55 dark:text-slate-400">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ ARCHITECTURE ============================ */}
      <section
        id="architecture"
        className="noise relative overflow-hidden bg-slate-900 py-20 text-white md:py-28 dark:bg-[#090D16] border-y border-slate-800"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="eyebrow text-citrus-300">04 — System blueprint</span>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              One pipeline, cart to gate.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              Shopper interaction, IoT telemetry, cloud services and physical gate
              actuation stitched into a single flow.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-2.5">
            {FLOW.map((step, i) => (
              <React.Fragment key={step}>
                <span
                  className={`rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                    i === FLOW.length - 1
                      ? "bg-gradient-to-r from-brand-500 to-citrus-400 text-slate-950 font-bold shadow-citrus"
                      : i === 0
                      ? "border border-citrus-400/40 bg-citrus-400/10 text-citrus-300"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {step}
                </span>
                {i < FLOW.length - 1 && (
                  <span className="text-xs text-citrus-400/70">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-12 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
            {[
              ["01 · In-cart edge", "Instant camera vision decodes barcodes and synchronizes session state."],
              ["02 · Cloud telemetry", "MongoDB Atlas holds session state, live bill and stock."],
              ["03 · Gate barrier", "Adafruit IO pulses a servo relay once Stripe verifies payment."],
            ].map(([title, body]) => (
              <div key={title}>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-citrus-300">
                  {title}
                </span>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== WHY =============================== */}
      <section id="why-baskit" className="bg-cream-100 py-20 dark:bg-[#090D16] md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="eyebrow">05 — Why BaskIt</span>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl text-ink dark:text-white">
                A better checkout, end to end.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/60 dark:text-slate-400">
                Built for shoppers who hate queues and operators who need accurate
                bills and live stock control.
              </p>
              <div className="mt-8 flex items-center gap-3 text-[11px] font-semibold text-ink/50 dark:text-slate-400">
                <HiOutlineShieldCheck className="text-lg text-brand-600 dark:text-citrus-400" />
                Stripe verifies every payment server-side.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {WHY.map(({ icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-cream-300/90 bg-cream-50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-white/[0.08] dark:bg-[#0F172A]"
                >
                  <div className="text-xl">{icon}</div>
                  <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55 dark:text-slate-400">
                    {body}
                  </p>
                </article>
              ))}
              <article className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white sm:col-span-2 dark:bg-[#0F172A] dark:border-white/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-semibold">
                      Scalable architecture
                    </h3>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate-400">
                      Sessions, billing and stock stay synchronized across the store,
                      and integrate with existing ERPs and payment gateways.
                    </p>
                  </div>
                  <HiOutlineLightningBolt className="text-2xl text-citrus-400" />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ================================ CTA ================================ */}
      <section className="bg-cream-100 pb-20 dark:bg-[#090D16]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="noise relative overflow-hidden rounded-5xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white sm:px-14 md:py-20 border border-indigo-500/20 shadow-lift">
            <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[28px] border-white/5" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full border-[22px] border-white/5" />

            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-citrus-400/30 bg-citrus-400/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-citrus-300">
                Future of retail
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl text-white">
                Designed for modern retail.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                BaskIt isn&apos;t just replacing a cashier. It reimagines the whole exit —
                from the moment a shopper picks up a cart to the moment the barrier
                opens.
              </p>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>Faster shopping.</span>
                <span>Smarter billing.</span>
                <span>Better exits.</span>
              </div>

              <button
                onClick={openDemoModal}
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-indigo transition-all hover:shadow-lg active:scale-95"
              >
                Start shopping smarter
                <HiArrowRight className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-slate-800 bg-slate-950 pb-10 pt-14 text-slate-400 dark:bg-[#060911]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 border-b border-slate-800 pb-10 md:flex-row md:items-center">
            <div>
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                Bask<span className="bg-gradient-to-r from-brand-400 to-citrus-400 bg-clip-text text-transparent">It</span>
              </span>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
                An intelligent billing and checkout system for modern retail.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-medium">
              {[
                ["features", "Product"],
                ["how-it-works", "How it works"],
                ["technology", "Technology"],
                ["architecture", "Architecture"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="transition-colors hover:text-citrus-400"
                >
                  {label}
                </button>
              ))}
              <Link to="/inventory" className="transition-colors hover:text-citrus-400">
                Shopkeeper portal
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 pt-8 text-[11px] text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} BaskIt. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <HiOutlineClock className="text-sm" />
              React · Node · MongoDB Atlas · Stripe · Adafruit IO
            </p>
          </div>
        </div>
      </footer>

      {/* ============================ DEMO MODAL ============================ */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-4xl border border-cream-300 bg-cream-50 p-6 shadow-lift dark:border-white/10 dark:bg-[#0F172A] sm:p-8">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 bg-cream-100 text-ink/50 transition-colors hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
              aria-label="Close"
            >
              <HiX className="text-lg" />
            </button>

            <div className="mb-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-xl text-white shadow-indigo">
                <HiOutlineShoppingCart />
              </span>
              <h3 className="mt-4 font-display text-2xl font-bold text-ink dark:text-white">Try BaskIt live</h3>
              <p className="mt-1 text-sm text-ink/55 dark:text-slate-400">
                Launch a customer cart or the shopkeeper console. A demo account is
                created automatically on first use.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin(ROLES.CUSTOMER)}
                disabled={loading}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-indigo flex items-center justify-center gap-2"
              >
                {loading ? "Starting demo…" : "🛒 Launch Demo Shopper (Live Cart)"}
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin(ROLES.SHOPKEEPER)}
                disabled={loading}
                className="btn-ghost w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 border-indigo-500/20 hover:border-indigo-500/50"
              >
                <HiOutlineAdjustments className="text-base text-indigo-400" />
                {loading ? "Starting demo…" : "🏪 Launch Demo Shopkeeper (5 Carts & 5 Gates)"}
              </button>
            </div>

            {/* Quick credentials card */}
            <div className="mt-4 p-3.5 bg-slate-100 dark:bg-black/50 border border-cream-300 dark:border-white/10 rounded-2xl text-[11px] font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-ink/60 dark:text-slate-400">Shopper:</span>
                <span className="font-semibold text-brand-600 dark:text-cyan-400">shopper@baskit.com · shopper@123</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/60 dark:text-slate-400">Shopkeeper:</span>
                <span className="font-semibold text-brand-600 dark:text-indigo-400">shopkeeper@baskit.com · shopkeeper@123</span>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-cream-300 bg-cream-100/70 p-3.5 text-[11px] leading-relaxed text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <HiOutlineSparkles className="mt-0.5 shrink-0 text-brand-600 dark:text-citrus-400" />
              Evaluator mode: everything runs against the live demo database, so
              scans, totals and gate passes are real.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
