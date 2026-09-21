import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  HiOutlineLockOpen,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineArrowPath,
  HiOutlineHome,
} from "react-icons/hi2";
import axiosInstance from "../../utils/axiosInstance";

const GateUnlock = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const gateNumber = searchParams.get("gate") || 1;

  const [status, setStatus] = useState("verifying"); // "verifying" | "unlocked" | "already_used" | "closed" | "error"
  const [message, setMessage] = useState("Verifying exit pass with BaskIt security...");
  const [countdown, setCountdown] = useState(4);

  const unlockBarrier = useCallback(async () => {
    if (!code) {
      setStatus("error");
      setMessage("No gate pass code provided.");
      return;
    }

    setStatus("verifying");
    setMessage("Verifying pass & signaling exit barrier...");

    try {
      const response = await axiosInstance.post("/gate/unlock", {
        code,
        gateNumber: Number(gateNumber) || 1,
      });

      const data = response.data;

      if (data.alreadyUnlocked) {
        setStatus("already_used");
        setMessage("This gate pass has already been used. Barrier remains locked.");
      } else if (data.unlocked) {
        setStatus("unlocked");
        setMessage("Exit barrier opened! You're good to go.");
        setCountdown(4);
      } else {
        setStatus("error");
        setMessage("Exit barrier did not respond. Please ask store staff for assistance.");
      }
    } catch (err) {
      console.error("Gate unlock error:", err);
      setStatus("error");
      setMessage(
        err.response?.data?.message ||
          "Could not validate gate pass. Please check your connection or see staff."
      );
    }
  }, [code, gateNumber]);

  useEffect(() => {
    unlockBarrier();
  }, [unlockBarrier]);

  // Handle auto-closing barrier countdown when unlocked
  useEffect(() => {
    if (status !== "unlocked") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("closed");
          setMessage("Exit barrier has closed automatically. Thank you for shopping!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-indigo-950/40 text-center relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-6 px-3 py-1 bg-slate-800/60 border border-slate-700/50 rounded-full">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-slate-300">
            BaskIt Smart Exit Gate
          </span>
        </div>

        {/* Icon & Status Visual */}
        <div className="mb-6">
          {status === "verifying" && (
            <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center relative">
              <HiOutlineArrowPath className="w-10 h-10 text-indigo-400 animate-spin" />
            </div>
          )}

          {status === "unlocked" && (
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20 flex items-center justify-center animate-bounce-short">
              <HiOutlineLockOpen className="w-12 h-12 text-emerald-400" />
            </div>
          )}

          {status === "already_used" && (
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <HiOutlineCheckCircle className="w-12 h-12 text-amber-400" />
            </div>
          )}

          {status === "closed" && (
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
              <HiOutlineLockClosed className="w-10 h-10 text-slate-400" />
            </div>
          )}

          {status === "error" && (
            <div className="w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-500/40 shadow-lg shadow-rose-500/20 flex items-center justify-center">
              <HiOutlineExclamationCircle className="w-12 h-12 text-rose-400" />
            </div>
          )}
        </div>

        {/* Status Heading */}
        <h1 className="text-2xl font-black tracking-tight mb-2">
          {status === "verifying" && "Scanning Pass..."}
          {status === "unlocked" && "Barrier Unlocked"}
          {status === "already_used" && "Pass Already Used"}
          {status === "closed" && "Barrier Closed"}
          {status === "error" && "Access Denied"}
        </h1>

        {/* Message */}
        <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
          {message}
        </p>

        {/* Countdown timer badge when unlocked */}
        {status === "unlocked" && (
          <div className="w-full bg-emerald-950/40 border border-emerald-800/40 rounded-2xl py-3 px-4 mb-6">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-2">
              <span>Barrier Closing In</span>
              <span className="font-mono text-base font-bold text-emerald-400">{countdown}s</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Pass details pill */}
        {code && (
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-2 w-full mb-6">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider mb-0.5">
              Pass Token
            </span>
            <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">
              {code}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="w-full space-y-3">
          {status === "error" && (
            <button
              onClick={unlockBarrier}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <HiOutlineArrowPath className="w-4 h-4" />
              Retry Unlock
            </button>
          )}

          <Link
            to="/"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 active:scale-95 transition-all rounded-xl text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5"
          >
            <HiOutlineHome className="w-4 h-4 text-slate-400" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GateUnlock;
