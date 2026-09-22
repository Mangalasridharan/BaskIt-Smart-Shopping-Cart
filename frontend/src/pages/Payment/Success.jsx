import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineExclamationCircle,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineHeart,
  HiOutlineShoppingBag,
} from "react-icons/hi";
import axiosInstance from "../../utils/axiosInstance";

const STORE_SESSION_KEY = "baskit.store";
const GATE_POLL_MS = 2500;

const formatAmount = (amount, currency) => {
  const value = Number(amount) || 0;
  if (!currency || currency === "INR") return `₹${value.toFixed(2)}`;
  return `${currency} ${value.toFixed(2)}`;
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString();
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const checkoutSessionId = searchParams.get("session_id") || "";

  const [status, setStatus] = useState("verifying"); // verifying | paid | error
  const [receipt, setReceipt] = useState(null);
  const [gatePass, setGatePass] = useState(null);
  const [gateState, setGateState] = useState("Locked"); // Locked | Unlocked
  const [isGateClosed, setIsGateClosed] = useState(false);
  const [unlockedAt, setUnlockedAt] = useState(null);
  const [message, setMessage] = useState("");

  const [demoCode, setDemoCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [gateError, setGateError] = useState("");
  const [gateNotice, setGateNotice] = useState("");

  const requested = useRef(false);

  useEffect(() => {
    if (!checkoutSessionId) {
      setStatus("error");
      setMessage("Stripe did not return a checkout session id.");
      return;
    }

    if (requested.current) return;
    requested.current = true;

    const verifyPayment = async () => {
      try {
        const response = await axiosInstance.post("/payment/verify", {
          checkoutSessionId,
        });

        const pass = response.data.gatePass || null;
        setReceipt(response.data.receipt);
        setGatePass(pass);

        const isPassUnlocked = pass?.status === "Unlocked";
        setGateState(isPassUnlocked ? "Unlocked" : "Locked");
        setUnlockedAt(pass?.unlockedAt || null);

        if (isPassUnlocked) {
          if (pass.unlockedAt) {
            const elapsed = Date.now() - new Date(pass.unlockedAt).getTime();
            if (elapsed >= 3500) {
              setIsGateClosed(true);
            } else {
              setTimeout(() => setIsGateClosed(true), Math.max(100, 4000 - elapsed));
            }
          } else {
            setIsGateClosed(true);
          }
        }

        setStatus("paid");

        // The session is complete; the next visit starts at the store QR gate.
        try {
          sessionStorage.removeItem(STORE_SESSION_KEY);
        } catch {
          /* storage can be unavailable */
        }
      } catch (err) {
        console.error("Error verifying Stripe payment:", err);
        setStatus("error");
        setMessage(
          err.response?.data?.message ||
            "We could not confirm your payment with Stripe. If money was deducted, contact support with your Stripe receipt."
        );
      }
    };

    verifyPayment();
  }, [checkoutSessionId]);

  // Keep polling until this pass reports itself unlocked and closed.
  useEffect(() => {
    if (status !== "paid" || !gatePass?.code || isGateClosed) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await axiosInstance.get(
          `/gate/status/${encodeURIComponent(gatePass.code)}`
        );

        if (cancelled) return;

        if (response.data?.gateStatus === "Unlocked") {
          setGateState("Unlocked");
          const unlockedTime = response.data.unlockedAt || new Date().toISOString();
          setUnlockedAt(unlockedTime);

          if (response.data?.gateClosed) {
            setIsGateClosed(true);
          } else {
            const elapsed = Date.now() - new Date(unlockedTime).getTime();
            setTimeout(() => {
              if (!cancelled) setIsGateClosed(true);
            }, Math.max(300, 4000 - elapsed));
          }
        }
      } catch {
        /* transient network errors: keep polling */
      }
    };

    const timer = setInterval(poll, GATE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status, gatePass, isGateClosed]);

  const unlockGate = async (code) => {
    const value = String(code ?? "").trim();

    if (!value) {
      setGateError("Type the demo code or scan your QR pass first.");
      return;
    }

    setUnlocking(true);
    setGateError("");
    setGateNotice("Opening gate barrier…");

    try {
      const response = await axiosInstance.post("/gate/unlock", {
        code: value,
        gateCode: gatePass?.code || undefined,
      });

      setGateState("Unlocked");
      const unlockedTime = response.data?.unlockedAt || new Date().toISOString();
      setUnlockedAt(unlockedTime);
      setGateNotice("Exit barrier is open! Walk through the lane. It will auto-close shortly.");
      setDemoCode("");

      // Transition to closed after the barrier cycle completes
      setTimeout(() => {
        setIsGateClosed(true);
        setGateNotice("Exit barrier has closed. Thank you for purchasing!");
      }, 1000);
    } catch (err) {
      setGateError(
        err.response?.data?.message ||
          "Could not open the gate. Check the Adafruit connection and try again."
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleDemoSubmit = (event) => {
    event.preventDefault();
    unlockGate(demoCode);
  };

  const isUnlocked = gateState === "Unlocked";

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-cream-100 px-4 py-10 font-sans text-ink transition-colors dark:bg-[#090D16] dark:text-slate-100">
      <div className="w-full max-w-lg overflow-hidden rounded-4xl border border-cream-300 bg-cream-50 shadow-lift animate-fade-in-up dark:border-white/[0.08] dark:bg-[#0F172A]">
        {status === "verifying" && (
          <div className="px-8 py-16 text-center">
            <span className="mx-auto mb-5 block h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent dark:border-citrus-400 dark:border-t-transparent" />
            <h1 className="font-display text-xl font-semibold">
              Confirming your payment
            </h1>
            <p className="mt-1.5 text-sm text-ink/50 dark:text-slate-400">
              Asking Stripe to verify the checkout session…
            </p>
          </div>
        )}

        {status === "paid" && receipt && (
          <div>
            {/* Header banner */}
            <div className="relative overflow-hidden bg-slate-900 px-8 pb-8 pt-7 text-white dark:bg-[#090D16] border-b border-slate-800">
              <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brand-500/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-citrus-400/30 bg-citrus-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-citrus-300">
                    <HiOutlineCheckCircle className="text-sm" />
                    {isGateClosed ? "Checkout Complete" : "Payment confirmed"}
                  </span>
                  <h1 className="mt-4 font-display text-2xl font-bold leading-tight">
                    {isGateClosed ? "Visit Completed" : "Show this pass at the exit gate"}
                  </h1>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-300">
                    {isGateClosed
                      ? "The exit barrier has securely closed. Your purchase is complete and your cart is clear."
                      : "Stripe verified your payment. Scan the QR at the gate scanner to open the barrier."}
                  </p>
                </div>

                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-citrus-400 text-2xl text-white shadow-citrus">
                  {isGateClosed ? <HiOutlineSparkles /> : <HiOutlineCheckCircle />}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* -------------------------------------------------------------------------- */}
              {/* CARD: Once Gate is Closed -> Thank You for Purchasing Card                 */}
              {/* -------------------------------------------------------------------------- */}
              {isGateClosed ? (
                <div className="animate-fade-in-up overflow-hidden rounded-3xl border-2 border-brand-500/30 bg-gradient-to-b from-brand-50/90 via-cream-50 to-citrus-50/40 p-6 shadow-lift dark:border-citrus-400/30 dark:from-[#0E1528] dark:via-[#0F172A] dark:to-[#090D16] sm:p-7">
                  <div className="flex flex-col items-center text-center">
                    {/* Glowing celebration badge */}
                    <div className="relative">
                      <span className="absolute -inset-2 animate-ping rounded-full bg-brand-400/20 dark:bg-citrus-400/20" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-3xl text-white shadow-indigo">
                        <HiOutlineSparkles />
                      </div>
                    </div>

                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-100/80 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-800 dark:border-citrus-400/30 dark:bg-citrus-400/10 dark:text-citrus-300">
                      <HiOutlineLockClosed className="text-sm" />
                      Exit Barrier Closed · Gate Locked
                    </span>

                    <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink dark:text-cream-100 sm:text-3xl">
                      Thank You for Purchasing!
                    </h2>

                    <p className="mt-2 max-w-md text-xs leading-relaxed text-ink/70 dark:text-cream-100/70 sm:text-sm">
                      We hope you had a fast and pleasant checkout at{" "}
                      <strong className="font-semibold text-brand-700 dark:text-citrus-400">
                        {receipt.storeName || "FreshMart Hypermarket"}
                      </strong>
                      . Your session has finished and the exit barrier has securely cycled closed.
                    </p>

                    {/* Summary Metric Chips */}
                    <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-cream-300 bg-white/80 p-3.5 text-center shadow-xs dark:border-white/10 dark:bg-white/[0.04]">
                        <span className="micro block text-ink/50 dark:text-cream-100/50">Total Paid</span>
                        <span className="mt-0.5 font-display text-base font-bold text-brand-700 dark:text-citrus-400 sm:text-lg">
                          {formatAmount(receipt.amount, receipt.currency)}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-cream-300 bg-white/80 p-3.5 text-center shadow-xs dark:border-white/10 dark:bg-white/[0.04]">
                        <span className="micro block text-ink/50 dark:text-cream-100/50">Items Bought</span>
                        <span className="mt-0.5 font-display text-base font-bold text-ink dark:text-cream-100 sm:text-lg">
                          {receipt.itemsCount ? `${receipt.itemsCount} Items` : "Items Packed"}
                        </span>
                      </div>

                      <div className="col-span-2 rounded-2xl border border-cream-300 bg-white/80 p-3.5 text-center shadow-xs dark:border-white/10 dark:bg-white/[0.04] sm:col-span-1">
                        <span className="micro block text-ink/50 dark:text-cream-100/50">Barrier State</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-700 dark:text-citrus-400 sm:text-sm">
                          <HiOutlineLockClosed className="text-sm" /> Closed (OFF)
                        </span>
                      </div>
                    </div>

                    {/* Warm Note */}
                    <div className="mt-5 flex items-center gap-2 rounded-2xl border border-brand-200/80 bg-white/70 px-4 py-2.5 text-xs text-brand-900 shadow-xs dark:border-white/5 dark:bg-white/[0.02] dark:text-cream-200">
                      <HiOutlineHeart className="shrink-0 text-base text-rose-500" />
                      <span>Have a wonderful day ahead! We look forward to seeing you again.</span>
                    </div>

                    {/* Primary CTAs */}
                    <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
                      <Link
                        to="/dashboard"
                        className="btn-lime flex-1 py-3.5 text-xs font-bold uppercase tracking-[0.14em]"
                      >
                        <HiOutlineShoppingBag className="text-base" />
                        Start New Session
                      </Link>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-ghost flex-1 py-3.5 text-xs"
                      >
                        <HiOutlineDownload /> Print Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* -------------------------------------------------------------------------- */
                /* Exit Pass & Scanner Screen (Before Gate is Closed)                         */
                /* -------------------------------------------------------------------------- */
                <div className="rounded-3xl border border-cream-300 bg-cream-100/60 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
                  {gatePass?.url ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="micro">Exit pass</span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                            isUnlocked
                              ? "bg-brand-600 text-white dark:bg-citrus-400 dark:text-ink"
                              : "border border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {isUnlocked ? (
                            <HiOutlineLockOpen className="text-sm" />
                          ) : (
                            <HiOutlineLockClosed className="text-sm" />
                          )}
                          {isUnlocked ? "Unlocked · Opening" : "Locked"}
                        </span>
                      </div>

                      <div
                        className={`mx-auto mt-5 w-fit rounded-3xl bg-gradient-to-tr from-brand-600 to-citrus-400 p-2.5 shadow-citrus transition-opacity ${
                          isUnlocked ? "opacity-40" : ""
                        }`}
                      >
                        <div className="rounded-2xl bg-white p-3">
                          <QRCodeSVG
                            value={gatePass.url}
                            size={188}
                            level="M"
                            bgColor="#FFFFFF"
                            fgColor="#0F172A"
                            marginSize={0}
                          />
                        </div>
                      </div>

                      <div className="mt-5 text-center">
                        <span className="micro block">Gate pass code</span>
                        <p className="mt-1 break-all font-mono text-[11px] font-semibold text-ink/70 dark:text-cream-100/70">
                          {gatePass.code}
                        </p>
                      </div>

                      <p className="mt-4 text-center text-[11px] leading-relaxed text-ink/50 dark:text-cream-100/50">
                        {isUnlocked
                          ? `Barrier opened${
                              unlockedAt ? ` at ${formatTime(unlockedAt)}` : ""
                            }. Auto-closing in seconds…`
                          : "Single-use pass. Keep this screen open — it updates as soon as the scanner reads the code."}
                      </p>

                      {!isUnlocked && (
                        <button
                          type="button"
                          onClick={() => unlockGate(gatePass.code)}
                          disabled={unlocking}
                          className="btn-lime mt-4 w-full py-3 text-[11px] uppercase tracking-[0.12em]"
                        >
                          <HiOutlineLockOpen className="text-base" />
                          {unlocking ? "Opening Gate…" : "Open gate with this pass"}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                      Your payment is confirmed, but the exit pass is not available.
                      Use the demo code below or ask a staff member for help.
                    </p>
                  )}
                </div>
              )}

              {/* Demo unlock form (hidden once gate has closed) */}
              {!isGateClosed && (
                <form
                  onSubmit={handleDemoSubmit}
                  className="mt-4 rounded-3xl border border-dashed border-cream-400 p-4 dark:border-white/15"
                >
                  <label htmlFor="demo-gate-code" className="input-label">
                    Demo unlock
                  </label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="demo-gate-code"
                      type="text"
                      value={demoCode}
                      onChange={(event) => setDemoCode(event.target.value)}
                      placeholder="Type completed"
                      autoComplete="off"
                      className="field min-w-0 flex-1"
                    />
                    <button
                      type="submit"
                      disabled={unlocking || !demoCode.trim()}
                      className="btn-primary shrink-0 px-5 py-3 text-[11px] uppercase tracking-[0.12em]"
                    >
                      {unlocking ? "Opening…" : "Unlock gate"}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink/40 dark:text-cream-100/40">
                    Type <span className="font-mono font-bold">completed</span> to open
                    the gate without a QR scan (test/demo only).
                  </p>
                  {gateError && (
                    <p className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400">
                      {gateError}
                    </p>
                  )}
                  {gateNotice && (
                    <p className="mt-2 text-[11px] font-semibold text-brand-700 dark:text-citrus-400">
                      {gateNotice}
                    </p>
                  )}
                </form>
              )}

              {/* Receipt ledger */}
              <div className="mt-4 rounded-3xl border border-cream-300 bg-cream-100/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-2 flex items-center justify-between border-b border-cream-300 pb-2.5 dark:border-white/10">
                  <span className="micro">Receipt</span>
                  <span className="micro">
                    {isGateClosed ? "Barrier closed (OFF)" : isUnlocked ? "Gate open (ON)" : "Gate locked (OFF)"}
                  </span>
                </div>

                <div className="divide-hairline text-xs">
                  {receipt.storeName && (
                    <div className="row-soft">
                      <span className="text-ink/50 dark:text-cream-100/50">Store</span>
                      <span className="font-semibold text-brand-700 dark:text-citrus-400">
                        {receipt.storeName}
                      </span>
                    </div>
                  )}
                  <div className="row-soft">
                    <span className="text-ink/50 dark:text-cream-100/50">
                      Transaction ID
                    </span>
                    <span className="break-all text-right font-mono text-[11px] font-semibold">
                      {receipt.transactionId}
                    </span>
                  </div>
                  <div className="row-soft">
                    <span className="text-ink/50 dark:text-cream-100/50">
                      Payment method
                    </span>
                    <span className="font-semibold">{receipt.paymentMethod}</span>
                  </div>
                  <div className="row-soft">
                    <span className="text-ink/50 dark:text-cream-100/50">
                      Total paid
                    </span>
                    <span className="font-display text-base font-bold text-brand-700 dark:text-citrus-400">
                      {formatAmount(receipt.amount, receipt.currency)}
                    </span>
                  </div>
                  <div className="row-soft">
                    <span className="text-ink/50 dark:text-cream-100/50">
                      Exit gate
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                        isGateClosed
                          ? "bg-brand-600 text-white dark:bg-citrus-400 dark:text-ink"
                          : isUnlocked
                          ? "bg-brand-500 text-white"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}
                    >
                      {isGateClosed ? "Closed (OFF)" : isUnlocked ? "Open (ON)" : "Locked (OFF)"}
                    </span>
                  </div>
                </div>
              </div>

              {!isGateClosed && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-ghost flex-1 py-3 text-xs"
                  >
                    <HiOutlineDownload /> Print receipt
                  </button>
                  <Link
                    to="/dashboard"
                    className="btn-primary flex-1 py-3 text-xs"
                  >
                    Start new session
                    <HiOutlineArrowRight />
                  </Link>
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-ink/35 dark:text-cream-100/35">
                <HiOutlineShieldCheck className="text-sm text-brand-600 dark:text-citrus-400" />
                Verified directly with Stripe
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <HiOutlineExclamationCircle />
            </div>

            <h1 className="font-display text-2xl font-bold">
              Payment not confirmed
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/50 dark:text-cream-100/50">
              {message}
            </p>

            <Link
              to="/dashboard"
              className="btn-primary mt-6 px-6 py-3 text-xs"
            >
              Back to dashboard
              <HiOutlineArrowRight />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
