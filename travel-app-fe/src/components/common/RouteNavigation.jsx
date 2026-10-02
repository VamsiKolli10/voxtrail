import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const titles = {
  "/": "Travel companion", "/home": "Dashboard", "/login": "Sign in",
  "/register": "Create account", "/forgot-password": "Forgot password",
  "/reset-password": "Reset password", "/verify-email": "Verify email",
  "/translation": "Translation", "/phrasebook": "Phrasebook",
  "/discover": "Discover", "/destinations": "Discover", "/stays": "Stays",
  "/emergency": "Emergency", "/cultural-guide": "Culture",
  "/terms": "Terms", "/privacy": "Privacy",
};

export default function RouteNavigation() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${titles[pathname] || "Travel workspace"} | VoxTrail`;
  }, [pathname]);
  return null;
}
