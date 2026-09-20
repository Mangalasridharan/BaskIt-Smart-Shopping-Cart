import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleHome, normalizeRole } from "../utils/constants";

const LoadingScreen = () => (
  <div className="grid-bg flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-100 text-ink/60 dark:bg-[#090D16] dark:text-slate-400">
    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-indigo">
      <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/30" />
      <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
    <p className="text-[10px] font-bold uppercase tracking-[0.24em]">
      Checking your session
    </p>
  </div>
);

// Requires a valid session. Optionally restricts access to specific roles.
export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = normalizeRole(user.role);

  if (allowedRoles?.length && !allowedRoles.map(normalizeRole).includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (token && user) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
