import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { auth } from "../firebase";
import { setUser, clearUser, setLoading } from "../store/slices/authSlice";
import FullScreenLoader from "../components/common/FullScreenLoader.jsx";
import { handleEmailVerification } from "../services/auth";
import { setRecentActivityUser } from "../utils/recentActivity";

const AuthContext = createContext();

function extractActionParams(urlString) {
  try {
    const url = new URL(urlString);
    const params = new URLSearchParams(url.search || "");
    // Fallback: some providers return action params in the hash fragment
    if ((!params.get("oobCode") || !params.get("mode")) && url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      hashParams.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");
    const apiKey = params.get("apiKey");
    return { mode, oobCode, apiKey };
  } catch (e) {
    return { mode: null, oobCode: null, apiKey: null };
  }
}

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const location = useLocation();
  const [statusMessage, setStatusMessage] = useState("Securing your session…");
  const [isEmailVerificationInProgress, setIsEmailVerificationInProgress] =
    useState(false);
  const [firebaseUser, firebaseLoading, firebaseError] = useAuthState(auth);
  const processedVerificationCode = useRef(null);

  useEffect(() => {
    setRecentActivityUser(authState.user?.uid);
  }, [authState.user?.uid]);

  const isPublicRoute = useMemo(() => {
    const path = location.pathname;
    return (
      path === "/" ||
      path === "/login" ||
      path === "/register" ||
      path === "/forgot-password" ||
      path === "/terms" ||
      path === "/privacy" ||
      path === "/auth-action" ||
      path.startsWith("/reset-password") ||
      path.startsWith("/verify-email")
    );
  }, [location.pathname]);

  useEffect(() => {
    dispatch(setLoading(true));
  }, [dispatch]);

  useEffect(() => {
    const maybeHandleEmailVerificationLink = async () => {
      // Dedicated action pages own their one-time codes and show their results.
      if (["/verify-email", "/auth-action", "/reset-password"].includes(location.pathname)) return;
      const { mode, oobCode, apiKey: linkApiKey } = extractActionParams(
        window.location.href
      );
      const clientApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

      // Some environments send mode=action; treat that as verify email too.
      if (!oobCode) return;
      const isVerifyEmailMode =
        !mode || mode === "verifyEmail" || mode === "action";
      if (!isVerifyEmailMode) return;
      if (processedVerificationCode.current === oobCode) return;
      processedVerificationCode.current = oobCode;

      setIsEmailVerificationInProgress(true);
      setStatusMessage("Verifying your email…");

      if (linkApiKey && clientApiKey && linkApiKey !== clientApiKey) {
        setStatusMessage(
          "This verification link belongs to a different environment. Open it from the same app that sent it."
        );
        setIsEmailVerificationInProgress(false);
        return;
      }

      let ok = false;
      try {
        ok = await handleEmailVerification(oobCode);
      } catch (error) {
        console.error("Email verification failed", error);
      }
      if (ok) {
        setStatusMessage("Email verified! Redirecting…");
        // Prevent re-processing on reload: drop the one-time action params.
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setStatusMessage(
          "Verification link is invalid or has expired. Request a new one from Login."
        );
      }

      setIsEmailVerificationInProgress(false);
      dispatch(setLoading(false));
    };

    maybeHandleEmailVerificationLink();
  }, [dispatch, location.pathname, location.search, location.hash]);

  useEffect(() => {
    let active = true;
    const syncUser = async () => {
      if (isEmailVerificationInProgress) return;

      if (firebaseLoading) {
        dispatch(setLoading(true));
        return;
      }

      dispatch(setLoading(true));
      try {
        if (firebaseError) {
          console.error("Auth subscription error", firebaseError);
          dispatch(clearUser());
          return;
        }

        if (firebaseUser) {
          await firebaseUser.reload();
          if (!active) return;
          try {
            // Force-refresh token to detect revocation (e.g., password reset elsewhere)
            await firebaseUser.getIdToken(true);
          } catch (tokenError) {
            if (!active) return;
            console.warn("Token refresh failed, forcing logout", tokenError);
            await signOut(auth);
            if (!active) return;
            dispatch(clearUser());
            setStatusMessage("Session expired. Please sign in again.");
            return;
          }
          if (!active) return;

          if (firebaseUser.emailVerified) {
            dispatch(
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                emailVerified: firebaseUser.emailVerified,
              })
            );
          } else {
            setStatusMessage("Waiting for email verification…");
            dispatch(clearUser());
          }
        } else {
          dispatch(clearUser());
        }
      } catch (error) {
        if (!active) return;
        console.error("Auth sync error", error);
        dispatch(clearUser());
      } finally {
        if (active) dispatch(setLoading(false));
      }
    };

    syncUser();
    return () => { active = false; };
  }, [
    dispatch,
    firebaseError,
    firebaseLoading,
    firebaseUser,
    isEmailVerificationInProgress,
  ]);

  const contextValue = useMemo(
    () => ({
      ...authState,
    }),
    [authState]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {authState.loading && !isPublicRoute && (
        <FullScreenLoader message={statusMessage} />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
