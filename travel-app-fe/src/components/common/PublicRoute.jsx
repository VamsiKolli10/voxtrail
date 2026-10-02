import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import FullScreenLoader from "./FullScreenLoader";

export default function PublicRoute({ children, redirectTo = "/home" }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const path = location.pathname;
  const isActionFlow =
    path.startsWith("/reset-password") ||
    path.startsWith("/verify-email") ||
    path.startsWith("/auth-action");
  const isLegalPage = path === "/terms" || path === "/privacy";

  // Only block with loader if we already have a user and we're resolving state;
  // otherwise let the public page render so local error state (e.g., unverified email) stays visible.
  if (loading && user && !isLegalPage && !isActionFlow) {
    return <FullScreenLoader message="Preparing your workspace…" />;
  }

  // Allow password reset/verification flows even if the user is signed in
  if (user && !isActionFlow && !isLegalPage) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ?? <Outlet />;
}
