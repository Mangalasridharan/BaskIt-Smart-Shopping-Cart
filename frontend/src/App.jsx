import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { ROLES } from "./utils/constants";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded page chunks for fast initial load & reduced bundle size
const Landing = lazy(() => import("./pages/Landing/Landing"));
const Home = lazy(() => import("./pages/Home/Home"));
const Login = lazy(() => import("./pages/Login/Login"));
const SignUp = lazy(() => import("./pages/SignUp/SignUp"));
const Inventory = lazy(() => import("./pages/Admin/Inventory"));
const PaymentSuccess = lazy(() => import("./pages/Payment/Success"));
const GateUnlock = lazy(() => import("./pages/Gate/GateUnlock"));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden select-none">
    <div className="absolute top-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-cyan-400 animate-spin mb-4" />
    <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400 animate-pulse">
      Loading BaskIt...
    </span>
  </div>
);

const routes = (
  <Router>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Customer area */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Stripe Checkout return page */}
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        {/* Shopkeeper area */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SHOPKEEPER]}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        {/* Legacy URL kept so old bookmarks still work */}
        <Route path="/admin" element={<Navigate to="/inventory" replace />} />

        {/* Public authentication pages */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignUp />
            </PublicOnlyRoute>
          }
        />

        {/* Public gate pass QR scanner destination */}
        <Route path="/gate/unlock/:code" element={<GateUnlock />} />

        {/* Fallback unknown paths to Landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </Router>
);

const App = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || "google-client-id-placeholder"}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            {routes}
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
};

export default App;
