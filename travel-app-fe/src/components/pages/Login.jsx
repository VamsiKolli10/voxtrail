import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Box,
  Divider,
  CircularProgress,
  useTheme,
  alpha,
  Button,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import AuthShell from "../layout/AuthShell";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import { loginWithEmail, resendEmailVerification } from "../../services/auth";
import { useAuth } from "../../contexts/AuthContext";
import { transitionFor } from "../../theme";

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: transitionFor("all"),
    "& fieldset": {
      borderColor: alpha(theme.palette.divider, 0.5),
    },
    "&:hover fieldset": {
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  },
  "& .MuiInputLabel-root": {
    "&.Mui-focused": {
      color: theme.palette.primary.main,
      fontWeight: 500,
    },
  },
}));

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify: showNotification } = useNotify();
  const theme = useTheme();
  const { user } = useAuth();
  const redirectPath = useMemo(
    () => {
      const from = location.state?.from;
      return from?.pathname
        ? `${from.pathname}${from.search || ""}${from.hash || ""}`
        : "/home";
    },
    [location.state]
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Refresh "now" every second to update cooldown timer
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load persisted cooldown for the current verification email
  useEffect(() => {
    if (!verificationEmail) {
      setResendCooldownUntil(null);
      return;
    }
    const key = `verifyResendUntil:${verificationEmail}`;
    const storage = typeof window !== "undefined" ? window.localStorage : null;
    let stored = null;
    try {
      const getItem = storage?.getItem || Storage?.prototype?.getItem;
      stored = typeof getItem === "function" ? getItem.call(storage, key) : null;
    } catch {
      stored = null;
    }
    const asNumber = stored ? Number(stored) : null;
    if (asNumber && asNumber > Date.now()) {
      setResendCooldownUntil(asNumber);
    } else {
      try {
        const removeItem = storage?.removeItem || Storage?.prototype?.removeItem;
        if (typeof removeItem === "function") removeItem.call(storage, key);
      } catch {
        // Ignore unavailable storage in private/restricted browser contexts.
      }
      setResendCooldownUntil(null);
    }
  }, [verificationEmail]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    // Don't clear infoMessage here - it might contain important verification info
  };

  useEffect(() => {
    if (!location.state) return;
    const { email: incomingEmail, verificationSent } = location.state;
    if (incomingEmail) {
      setFormData((prev) => ({ ...prev, email: incomingEmail }));
      setVerificationEmail(incomingEmail);
    }
    if (verificationSent) {
      setInfoMessage(
        `We sent a verification link to ${
          incomingEmail || "your email"
        }. Verify it before signing in.`
      );
    }

    // Clear the state to prevent showing the message again
    navigate(location.pathname, { replace: true });
  }, [location, navigate]);

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, redirectPath, navigate]);

  const validate = () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError("");
    try {
      await loginWithEmail(formData.email, formData.password);

      // Extra guard: if for any reason loginWithEmail resolves but the user is still unverified
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        const email = auth.currentUser?.email || formData.email;
        setError("Please verify your email before continuing.");
        setVerificationEmail(email);
        setResendCooldownUntil(null);
        setInfoMessage(
          `Your account isn't verified yet. Check ${email} for the verification email, or resend it below.`
        );
        showNotification("Verify your email to continue.", "warning");
        await signOut(auth);
        return;
      }

      showNotification("Login successful! Redirecting…", "success");
    } catch (err) {
      const codeLabel = err?.code || "unknown";
      const isUnverified =
        err?.code === "auth/email-not-verified" ||
        err?.name === "EmailNotVerifiedError" ||
        String(err?.message || "")
          .toLowerCase()
          .includes("not verified") ||
        String(err?.message || "")
          .toLowerCase()
          .includes("email not verified");

      if (isUnverified) {
        const email = err?.email || formData.email || verificationEmail;
        setError("Please verify your email before continuing.");
        setVerificationEmail(email);
        setResendCooldownUntil(null);
        setInfoMessage(
          `Your account isn't verified yet. Check ${email} for the verification email, or resend it below.`
        );
        showNotification("Verify your email to continue.", "warning");
        // The loginWithEmail function already handles signing out the user
      } else {
        setError(
          `Login failed. Please check your credentials and try again. (code: ${codeLabel})`
        );
        showNotification(`Login failed. (code: ${codeLabel})`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;

    const cooldownRemainingMs = resendCooldownUntil
      ? Math.max(0, resendCooldownUntil - nowTick)
      : 0;
    if (cooldownRemainingMs > 0) {
      return;
    }

    if (!formData.password) {
      showNotification(
        "Enter your password before requesting another verification email.",
        "warning"
      );
      return;
    }

    setResendingVerification(true);
    try {
      await resendEmailVerification({
        user: auth.currentUser ?? undefined,
        email: verificationEmail,
        password: formData.password,
      });

      const nextAllowed = Date.now() + 5 * 60 * 1000; // 5 minutes
      setResendCooldownUntil(nextAllowed);
      try {
        const storage = window.localStorage;
        if (typeof storage?.setItem === "function") {
          storage.setItem(
            `verifyResendUntil:${verificationEmail}`,
            String(nextAllowed)
          );
        }
      } catch {
        // Verification still succeeds when browser storage is unavailable.
      }

      showNotification(
        "Verification email sent! Please check your inbox.",
        "success"
      );
      setInfoMessage(
        `We sent another verification link to ${verificationEmail}.`
      );
    } catch (error) {
      console.error("Resend verification error:", error);
      showNotification(
        "Failed to resend verification email. Please try again.",
        "error"
      );
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <AuthShell
      icon="🔐"
      title="Welcome back"
      subtitle="Sign in to access your VoxTrail dashboard."
      backLink={{ to: "/", label: "← Back to home" }}
      footer={
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Don't have an account? <Link to="/register">Create one</Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link to="/forgot-password">Forgot your password?</Link>
          </Typography>
        </Stack>
      }
    >
      <Box>
        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError("")}
              sx={{
                borderRadius: 2,
                animation: "fadeIn 0.3s ease",
                "@keyframes fadeIn": {
                  "0%": { opacity: 0, transform: "translateY(-10px)" },
                  "100%": { opacity: 1, transform: "translateY(0)" },
                },
              }}
            >
              {error}
              {verificationEmail && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleResendVerification}
                    startIcon={
                      resendingVerification ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <EmailIcon fontSize="small" />
                      )
                    }
                    disabled={
                      resendingVerification ||
                      (resendCooldownUntil
                        ? resendCooldownUntil - nowTick > 0
                        : false)
                    }
                  >
                    {resendingVerification
                      ? "Resending..."
                      : resendCooldownUntil && resendCooldownUntil - nowTick > 0
                      ? `Resend in ${Math.ceil(
                          (resendCooldownUntil - nowTick) / 1000 / 60
                        )}m`
                      : "Resend verification email"}
                  </Button>
                </Box>
              )}
            </Alert>
          )}

          <Box sx={{ position: "relative" }}>
            <StyledTextField
              label="Email address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              autoComplete="email"
              fullWidth
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon
                      color={focusedField === "email" ? "primary" : "action"}
                      fontSize="small"
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ position: "relative" }}>
            <StyledTextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              autoComplete="current-password"
              fullWidth
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon
                      color={focusedField === "password" ? "primary" : "action"}
                      fontSize="small"
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      sx={{
                        transition: transitionFor("transform", "fast"),
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            onClick={() => console.log("Login button clicked")}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              position: "relative",
              overflow: "hidden",
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                transition: transitionFor("left", "slow"),
              },
              "&:hover::after": {
                left: "100%",
              },
            }}
          >
            {loading ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="center"
              >
                <CircularProgress size={20} color="inherit" />
                <span>Signing in…</span>
              </Stack>
            ) : (
              "Sign in"
            )}
          </Button>
        </Stack>
      </Box>
    </AuthShell>
  );
}
