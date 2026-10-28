import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, CircularProgress, Stack, Typography, Button } from "@mui/material";
import AuthShell from "../layout/AuthShell";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import { handleEmailVerification } from "../../services/auth";

function extractActionParams(searchParams) {
  const searchMode = searchParams.get("mode");
  const searchOob = searchParams.get("oobCode");
  const searchApiKey = searchParams.get("apiKey");

  // Fallback to hash fragment if query params are missing (some flows return #mode=...&oobCode=...)
  let hashMode = null;
  let hashOob = null;
  let hashApiKey = null;
  if (typeof window !== "undefined" && window.location.hash) {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );
    hashMode = hashParams.get("mode");
    hashOob = hashParams.get("oobCode");
    hashApiKey = hashParams.get("apiKey");
  }

  return {
    mode: searchMode || hashMode,
    oobCode: searchOob || hashOob,
    apiKey: searchApiKey || hashApiKey,
  };
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify: showNotification } = useNotify();

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const verificationAttempt = useRef(null);

  const { mode, oobCode, apiKey: linkApiKey } = useMemo(
    () => extractActionParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      const clientApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

      const isVerifyEmailMode =
        !mode || mode === "verifyEmail" || mode === "action";

      if (!isVerifyEmailMode || !oobCode) {
        if (isMounted) {
          setError("Verification link is missing or invalid. Request a new one.");
          setVerifying(false);
        }
        return;
      }

      if (linkApiKey && clientApiKey && linkApiKey !== clientApiKey) {
        const message =
          "This verification link belongs to a different environment. Open it from the same app that sent it.";
        if (isMounted) {
          setError(message);
          setVerifying(false);
        }
        showNotification(message, "error");
        return;
      }

      const emailFromLink =
        searchParams.get("email") ||
        (typeof window !== "undefined" && window.location.hash
          ? new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
              "email"
            )
          : null);
      if (emailFromLink && isMounted) {
        setVerifiedEmail(emailFromLink);
      }

      try {
        // StrictMode replays effects. Both runs must await the same operation
        // so a one-time code is never submitted twice.
        if (verificationAttempt.current?.code !== oobCode) {
          verificationAttempt.current = { code: oobCode, result: handleEmailVerification(oobCode) };
        }
        const ok = await verificationAttempt.current.result;
        if (!isMounted) return;

        if (ok) {
          setSuccess(true);
          setError("");
          showNotification("Email verified! You can now sign in.", "success");
        } else {
          const message =
            "Verification link is invalid or has expired. Request a new one from Login.";
          setError(message);
          showNotification(message, "error");
        }
      } catch (err) {
        const message =
          "Verification failed. Please try again or request a new link.";
        if (isMounted) {
          setError(message);
        }
        showNotification(message, "error");
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [searchParams, showNotification]);

  return (
    <AuthShell
      icon="✉️"
      title="Verify your email"
      subtitle="Confirm your address to finish setting up your account."
      backLink={{ to: "/", label: "← Back to home" }}
      footer={
        <Typography variant="body2" color="text.secondary" align="center">
          Already verified? <Link to="/login">Sign in here</Link>
        </Typography>
      }
    >
      <Stack spacing={3} alignItems="center">
        {verifying && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Verifying your email…
            </Typography>
          </Stack>
        )}

        {!verifying && success && (
          <Alert severity="success" sx={{ width: "100%", borderRadius: 2 }}>
            Email verified{verifiedEmail ? ` for ${verifiedEmail}` : ""}! You can
            now sign in.
          </Alert>
        )}

        {!verifying && error && (
          <Alert severity="error" sx={{ width: "100%", borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {!verifying && (
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to login
          </Button>
        )}
      </Stack>
    </AuthShell>
  );
}
