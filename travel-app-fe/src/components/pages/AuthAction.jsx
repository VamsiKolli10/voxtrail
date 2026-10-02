import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, CircularProgress, Stack, Typography, Button } from "@mui/material";
import AuthShell from "../layout/AuthShell";

function extractParams(searchParams, hashString) {
  const base = new URLSearchParams(searchParams);

  if (hashString) {
    const hashParams = new URLSearchParams(hashString.replace(/^#/, ""));
    hashParams.forEach((val, key) => {
      if (!base.has(key)) base.set(key, val);
    });
  }

  const mode = base.get("mode");
  const oobCode = base.get("oobCode");
  const apiKey = base.get("apiKey");
  const email = base.get("email");
  const continueUrl = base.get("continueUrl");

  return { mode, oobCode, apiKey, email, continueUrl, all: base };
}

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const { mode, oobCode, apiKey, email, continueUrl } = useMemo(
    () => extractParams(searchParams, location.hash),
    [searchParams, location.hash]
  );

  useEffect(() => {
    if (!mode || !oobCode) {
      setError("Verification or reset link is missing required parameters.");
      return;
    }

    const qp = new URLSearchParams();
    qp.set("mode", mode);
    qp.set("oobCode", oobCode);
    if (apiKey) qp.set("apiKey", apiKey);
    if (email) qp.set("email", email);

    // Route by mode using our in-app pages
    if (mode === "verifyEmail" || mode === "action") {
      if (continueUrl) qp.set("continueUrl", continueUrl);
      navigate(`/verify-email?${qp.toString()}`, { replace: true });
    } else if (mode === "resetPassword") {
      navigate(`/reset-password?${qp.toString()}`, { replace: true });
    } else {
      setError(`Unsupported action mode: ${mode}`);
    }
  }, [apiKey, continueUrl, email, mode, navigate, oobCode]);

  return (
    <AuthShell
      icon="🔗"
      title="Processing your link"
      subtitle="We’ll direct you to the right place."
      backLink={{ to: "/", label: "← Back to home" }}
    >
      <Stack spacing={3} alignItems="center">
        {!error && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Checking your link…
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              mode={mode || "—"} • code={oobCode ? "present" : "missing"}
            </Typography>
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ width: "100%", borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {error && (
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
