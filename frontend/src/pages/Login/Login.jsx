import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import PasswordInput from "../../components/Input/PasswordInput";
import { validateEmail } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../utils/constants";
import ThemeToggle from "../../components/ThemeToggle";
import {
  HiChevronLeft,
  HiOutlineShieldCheck,
  HiOutlineQrcode,
  HiOutlineShoppingCart,
  HiOutlineSparkles,
} from "react-icons/hi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setIsSubmitting(true);
    try {
      const user = await loginWithGoogle({ idToken: credentialResponse.credential });
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Google sign-in failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed. Please try again.");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter the password");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred. Please try again!";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setIsSubmitting(true);
    try {
      const user = await login(demoEmail, demoPassword);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to log in with demo account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-cream-100 font-sans dark:bg-[#090D16] lg:grid-cols-2">
      {/* Editorial panel */}
      <aside className="noise relative hidden overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14 dark:bg-[#090D16] border-r border-slate-800/80">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full border-[30px] border-brand-500/15" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-citrus-400/15 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-citrus-400 text-white shadow-citrus">
            <HiOutlineShoppingCart className="text-lg" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Bask<span className="bg-gradient-to-r from-brand-400 to-citrus-400 bg-clip-text text-transparent">It</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-citrus-400/30 bg-citrus-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-citrus-300">
            <HiOutlineSparkles className="text-sm" />
            Welcome back
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold leading-[1.08] xl:text-5xl">
            The shortest path from shelf to street.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-300">
            Pick up where you left off — your cart session, live bill and saved
            shopping list are waiting.
          </p>

          <div className="mt-10 space-y-4">
            {[
              [HiOutlineQrcode, "Two-step store and cart scan"],
              [HiOutlineShieldCheck, "Stripe-verified payment"],
              [HiOutlineShoppingCart, "Barcode-gated cart edits"],
            ].map(([Icon, label]) => (
              <div key={label} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-citrus-300">
                  <Icon className="text-base" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          React · Node · MongoDB · Stripe · Adafruit IO
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="btn-icon"
              aria-label="Back to landing"
            >
              <HiChevronLeft className="text-xl" />
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 font-display text-lg font-bold lg:hidden"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo">
                <HiOutlineShoppingCart className="text-sm" />
              </span>
              Bask<span className="-ml-1.5 text-brand-600 dark:text-citrus-400">It</span>
            </Link>
          </div>

          <span className="eyebrow">Account access</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink dark:text-white sm:text-4xl">
            Sign in to BaskIt
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/55 dark:text-slate-400">
            Customers land in their smart basket, shopkeepers in inventory. New here?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-citrus-400"
            >
              Create an account
            </Link>
            .
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="input-label" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="login-password">
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/40">
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-2 w-full py-3.5 text-sm font-bold shadow-indigo"
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>

            <div className="flex items-center py-1">
              <div className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
              <span className="px-4 text-[9px] font-bold uppercase tracking-[0.2em] text-ink/35 dark:text-slate-400">
                or continue with
              </span>
              <div className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
            </div>

            <div className="flex justify-center pt-1">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                shape="pill"
                size="large"
                text="signin_with"
                theme="outline"
                width="100%"
              />
            </div>

            {/* Quick Demo Accounts */}
            <div className="pt-2">
              <div className="flex items-center mb-3">
                <div className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
                <span className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-cyan-400">
                  Instant Evaluator Demo
                </span>
                <div className="h-px flex-1 bg-cream-300 dark:bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDemo("shopper@baskit.com", "shopper@123")}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 dark:border-white/10 bg-cream-50 dark:bg-slate-900/60 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-bold text-ink dark:text-slate-200 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 shadow-sm"
                >
                  <span className="text-cyan-500 dark:text-cyan-400 font-extrabold">🛒 Demo Shopper</span>
                  <span className="text-[9px] font-normal text-ink/40 dark:text-slate-400 font-mono">Live Cart Experience</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDemo("shopkeeper@baskit.com", "shopkeeper@123")}
                  className="py-2.5 px-3 rounded-xl border border-cream-300 dark:border-white/10 bg-cream-50 dark:bg-slate-900/60 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-800 text-[11px] font-bold text-ink dark:text-slate-200 transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 shadow-sm"
                >
                  <span className="text-indigo-500 dark:text-indigo-400 font-extrabold">🏪 Demo Shopkeeper</span>
                  <span className="text-[9px] font-normal text-ink/40 dark:text-slate-400 font-mono">5 Carts & 5 Gates</span>
                </button>
              </div>
            </div>

            <p className="pt-2 text-center text-xs font-medium text-ink/50 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-brand-600 underline-offset-4 hover:underline dark:text-citrus-400"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
