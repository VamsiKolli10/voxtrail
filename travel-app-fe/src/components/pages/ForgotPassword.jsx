import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import AuthShell from "../layout/AuthShell";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import { sendPasswordReset } from "../../services/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { notify: showNotification } = useNotify();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email) {
      setError("Please enter your email address");
      return false;
    }
    if (!email.includes("@")) {
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
      await sendPasswordReset(email);
      setSuccess(true);
      showNotification("Password reset email sent successfully!", "success");
    } catch (err) {
      const message =
        err?.code === "auth/user-not-found"
          ? "No account found for that email."
          : err?.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : "Failed to send reset email. Please try again.";
      setError(message);
      showNotification(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Enter your email before resending the link.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(email);
      showNotification("Reset email sent again!", "success");
    } catch (err) {
      const message =
        err?.code === "auth/user-not-found"
          ? "No account found for that email."
          : "Failed to resend email. Please try again.";
      setError(message);
      showNotification(message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        icon="📧"
        title="Check your email"
        subtitle={`We've sent password reset instructions to ${email}`}
        backLink={{ to: "/", label: "← Back to home" }}
        footer={
          <Typography variant="body2" color="text.secondary" align="center">
            Ready to continue? <Link to="/login">Return to sign in</Link>
          </Typography>
        }
      >
        <Stack spacing={3}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Password reset email sent
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We just sent a reset link to <strong>{email}</strong>. Check your inbox (and
            spam) to finish resetting your password. If you opened this in another tab or
            device, use the same email when prompted.
          </Typography>
          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              "Open the email titled “Reset your VoxTrail password.”",
              "Tap the reset link to create a new password.",
              "Return here and sign in with your new credentials.",
            ].map((text, index) => (
              <ListItem
                key={text}
                sx={{
                  border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                  borderRadius: 2,
                  alignItems: "flex-start",
                  gap: 2,
                  p: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="primary"
                  sx={{ fontWeight: 600, minWidth: 24 }}
                >
                  {index + 1}
                </Typography>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="🔑"
      title="Forgot password?"
      subtitle="Enter the email linked to your account and we’ll send a reset link."
      backLink={{ to: "/", label: "← Back to home" }}
      footer={
        <Typography variant="body2" color="text.secondary" align="center">
          Remember your password? <Link to="/login">Sign in</Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={3} onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError("");
          }}
          autoComplete="email"
          fullWidth
          disabled={loading}
          helperText="We’ll send password reset instructions to this email."
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
        >
          {loading ? "Sending reset email…" : "Send reset email"}
        </Button>

        <Stack spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Need help? <Link to="/register">Create a new account</Link>
          </Typography>
        </Stack>
      </Stack>
    </AuthShell>
  );
}
