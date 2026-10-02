import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Alert,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import AuthShell from "../layout/AuthShell";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import {
  confirmPasswordResetWithCode,
  verifyPasswordReset,
} from "../../services/auth";

function extractActionParams(searchParams, hashString) {
  const base = new URLSearchParams(searchParams);

  if (hashString) {
    const hashParams = new URLSearchParams(hashString.replace(/^#/, ""));
    hashParams.forEach((val, key) => {
      if (!base.has(key)) base.set(key, val);
    });
  }

  return {
    oobCode: base.get("oobCode"),
    apiKey: base.get("apiKey"),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify: showNotification } = useNotify();
  const [searchParams] = useSearchParams();

  const clientApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(
    location.state?.email || ""
  );
  const [verifyingLink, setVerifyingLink] = useState(true);

  const { oobCode, apiKey: linkApiKey } = useMemo(
    () => extractActionParams(searchParams, location.hash),
    [location.hash, searchParams]
  );

  useEffect(() => {
    let isMounted = true;
    const verifyLink = async () => {
      if (!oobCode) {
        if (isMounted) {
          setError(
            "Reset link is missing or invalid. Please request a new link."
          );
          setVerifyingLink(false);
        }
        return;
      }

      if (linkApiKey && clientApiKey && linkApiKey !== clientApiKey) {
        const message =
          "This reset link belongs to a different environment. Open the link from the same app that issued it.";
        if (isMounted) {
          setError(message);
          setVerifyingLink(false);
        }
        showNotification(message, "error");
        return;
      }

      try {
        const email = await verifyPasswordReset(oobCode);
        if (isMounted) {
          setVerifiedEmail(email);
          setError("");
        }
      } catch (err) {
        const message =
          "Reset link is invalid or has expired. Please request a new one.";
        if (isMounted) {
          setError(message);
        }
        showNotification(message, "error");
      } finally {
        if (isMounted) setVerifyingLink(false);
      }
    };

    verifyLink();
    return () => {
      isMounted = false;
    };
  }, [oobCode, showNotification]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validate = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError("Please fill in both password fields");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (!oobCode) {
      setError(
        "Reset link is missing or invalid. Request a new one from Forgot Password."
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      await confirmPasswordResetWithCode(oobCode, formData.password);
      setSuccess(true);
      showNotification("Password reset successfully!", "success");
    } catch (err) {
      const message =
        err?.code === "auth/expired-action-code"
          ? "Reset link has expired. Please request a new one."
          : "Failed to reset password. Please try again.";
      setError(message);
      showNotification(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const primaryContent = (
    <Stack component="form" spacing={3} onSubmit={handleSubmit}>
      {verifyingLink && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Verifying your reset link…
        </Alert>
      )}
      {!verifyingLink && oobCode && !error && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Reset link verified. Set a new password for{" "}
          {verifiedEmail || "your account"}.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      <TextField
        label="New password"
        name="password"
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={handleChange}
        autoComplete="new-password"
        fullWidth
        disabled={loading || verifyingLink || !oobCode}
        helperText="Must be at least 6 characters"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword((prev) => !prev)}
                edge="end"
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Confirm new password"
        name="confirmPassword"
        type={showConfirmPassword ? "text" : "password"}
        value={formData.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
        fullWidth
        disabled={loading || verifyingLink || !oobCode}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                edge="end"
                disabled={loading}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <VisibilityOffIcon />
                ) : (
                  <VisibilityIcon />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading || verifyingLink || !oobCode}
      >
        {loading ? "Updating password…" : "Update password"}
      </Button>

      <Stack spacing={1.5} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Need help? <Link to="/forgot-password">Request a new link</Link>
        </Typography>
      </Stack>
    </Stack>
  );

  if (success) {
    return (
      <AuthShell
        icon="✅"
        title="Password reset complete"
        subtitle="You can now sign in with your new password."
        backLink={{ to: "/", label: "← Back to home" }}
        footer={
          <Typography variant="body2" color="text.secondary" align="center">
            For extra security, enable two-factor authentication in your profile
            settings.
          </Typography>
        }
      >
        <Stack spacing={3}>
          <List
            disablePadding
            sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {[
              {
                primary: "Sign in",
                secondary: "Use your new password next time you log in.",
              },
              {
                primary: "Stay secure",
                secondary:
                  "Avoid reusing passwords and consider a password manager.",
              },
            ].map((step) => (
              <ListItem
                key={step.primary}
                sx={{
                  border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                  borderRadius: 2,
                  alignItems: "flex-start",
                  gap: 2,
                  p: 2,
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {step.primary}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {step.secondary}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => navigate("/login")}
          >
            Continue to login
          </Button>
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="🛠️"
      title="Reset your password"
      subtitle="Enter a new password you'll remember."
      backLink={{ to: "/", label: "← Back to home" }}
      footer={
        <Typography variant="body2" color="text.secondary" align="center">
          Remember your password? <Link to="/login">Sign in</Link>
        </Typography>
      }
    >
      {primaryContent}
    </AuthShell>
  );
}
