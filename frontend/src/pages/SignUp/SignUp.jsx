import { useState } from "react";
import PasswordInput from "../../components/Input/PasswordInput";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { validateEmail } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome, MIN_PASSWORD_LENGTH, ROLES } from "../../utils/constants";
import ThemeToggle from "../../components/ThemeToggle";
import {
  HiChevronLeft,
  HiOutlineShoppingCart,
  HiOutlineAdjustments,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineQrcode,
} from "react-icons/hi";

const ROLE_OPTIONS = [
  {
    value: ROLES.CUSTOMER,
    title: "Customer",
    description: "Shop with a smart cart and pay without queueing.",
    icon: HiOutlineShoppingCart,
  },
  {
    value: ROLES.SHOPKEEPER,
    title: "Shopkeeper",
    description: "Manage the catalogue, stock levels and pricing.",
    icon: HiOutlineAdjustments,
  },
];

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(ROLES.CUSTOMER);
  const [storeName, setStoreName] = useState("");
  const [numberOfCarts, setNumberOfCarts] = useState(5);
  const [numberOfGates, setNumberOfGates] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    if (role === ROLES.SHOPKEEPER && !storeName.trim()) {
      setError("Please enter your supermarket name before signing up with Google.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const user = await loginWithGoogle({
        idToken: credentialResponse.credential,
        role,
        store: role === ROLES.SHOPKEEPER ? {
          name: storeName.trim(),
          numberOfCarts: Number(numberOfCarts) || 5,
          numberOfGates: Number(numberOfGates) || 1,
        } : null,
      });
      navigate(getRoleHome(user.role), { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Google sign-up failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-up was cancelled or failed. Please try again.");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (role === ROLES.SHOPKEEPER) {
      if (!storeName.trim()) {
        setError("Supermarket name is required for shopkeeper registration");
        return;
      }
      if (Number(numberOfCarts) < 1) {
        setError("Number of carts must be at least 1");
        return;
      }
      if (Number(numberOfGates) < 1) {
        setError("Number of gates must be at least 1");
        return;
      }
    }

    setError("");
    setIsSubmitting(true);

    try {
      const user = await register({
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        store: role === ROLES.SHOPKEEPER ? {
          name: storeName.trim(),
          numberOfCarts: Number(numberOfCarts) || 5,
          numberOfGates: Number(numberOfGates) || 1,
        } : null,
      });
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

  return (
    <div className="grid min-h-screen bg-cream-100 font-sans dark:bg-[#090D16] lg:grid-cols-2">
      {/* Editorial panel */}
      <aside className="noise relative hidden overflow-hidden bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14 dark:bg-[#090D16] border-r border-slate-800/80">
        <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full border-[30px] border-brand-500/15" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-citrus-400/15 blur-3xl" />

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
            Create your account
          </span>
          <h2 className="mt-6 font-display text-4xl font-bold leading-[1.08] xl:text-5xl">
            One account.
            <br />
            Both sides of the store.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-300">
            Shop the smart way or run the catalogue. Your role decides where you land
            — everything else works the same.
          </p>

          <div className="mt-10 space-y-4">
            {[
              [HiOutlineQrcode, "Scan store and cart to start"],
              [HiOutlineShieldCheck, "Payments verified with Stripe"],
              [HiOutlineAdjustments, "Shopkeepers get stock control"],
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
          No queues · No cashier · No paper bill
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

          <span className="eyebrow">Get started</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink dark:text-white sm:text-4xl">
            Create your account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/55 dark:text-slate-400">
            Choose how you&apos;ll use BaskIt, then sign in with your email and
            password.
          </p>

          <form onSubmit={handleSignUp} className="mt-8 space-y-5">
            <div>
              <span className="input-label">I am a</span>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = role === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      aria-pressed={isSelected}
                      className={`rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-brand-600 bg-brand-50 text-brand-700 shadow-indigo dark:border-brand-400 dark:bg-brand-500/20 dark:text-brand-300"
                          : "border-cream-300 bg-white hover:border-brand-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="shrink-0 text-base" />
                        {option.title}
                      </span>
                      <span
                        className={`mt-1 block text-[11px] leading-snug ${
                          isSelected ? "text-brand-700/80 dark:text-brand-200/80" : "text-ink/45 dark:text-slate-400"
                        }`}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="signup-name">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                placeholder="Enter full name"
                autoComplete="name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label" htmlFor="signup-email">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <span className="input-label">Password</span>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
            </div>

            <div>
              <span className="input-label">Confirm password</span>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            {/* Shopkeeper-specific store configuration */}
            {role === ROLES.SHOPKEEPER && (
              <div className="space-y-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 dark:border-citrus-400/20 dark:bg-citrus-400/5">
                <div className="flex items-center gap-2 border-b border-brand-500/10 pb-2 dark:border-citrus-400/10">
                  <HiOutlineQrcode className="text-base text-brand-600 dark:text-citrus-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-cream-100">
                    Supermarket Setup
                  </span>
                </div>

                <div>
                  <label className="input-label" htmlFor="signup-store-name">
                    Supermarket name
                  </label>
                  <input
                    id="signup-store-name"
                    type="text"
                    required
                    placeholder="e.g. FreshMart Hypermarket"
                    className="field"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label" htmlFor="signup-store-carts">
                      Number of carts
                    </label>
                    <input
                      id="signup-store-carts"
                      type="number"
                      min="1"
                      max="100"
                      required
                      className="field"
                      value={numberOfCarts}
                      onChange={(e) => setNumberOfCarts(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>

                  <div>
                    <label className="input-label" htmlFor="signup-store-gates">
                      Number of gates
                    </label>
                    <input
                      id="signup-store-gates"
                      type="number"
                      min="1"
                      max="20"
                      required
                      className="field"
                      value={numberOfGates}
                      onChange={(e) => setNumberOfGates(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                </div>
              </div>
            )}

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
              {isSubmitting ? "Creating account…" : "Create account"}
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
                text="signup_with"
                theme="outline"
                width="100%"
              />
            </div>

            <p className="pb-4 pt-2 text-center text-xs font-medium text-ink/50 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-brand-600 underline-offset-4 hover:underline dark:text-citrus-400"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
