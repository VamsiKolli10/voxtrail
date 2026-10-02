import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Checkbox,
  Grid,
  IconButton,
  InputAdornment,
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
import { registerWithEmail } from "../../services/auth";

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "One number", test: (pw) => /\d/.test(pw) },
  {
    id: "symbol",
    label: "One special character",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { notify: showNotification } = useNotify();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        valid: rule.test(formData.password || ""),
      })),
    [formData.password]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const validate = () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill in all required fields");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    const missingRules = passwordChecks.filter((rule) => !rule.valid);
    if (missingRules.length) {
      setError(
        `Password must meet all requirements. Missing: ${missingRules
          .map((rule) => rule.label.toLowerCase())
          .join(", ")}.`
      );
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!formData.agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
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
      await registerWithEmail(formData);
      showNotification(
        `Account created! We sent a verification link to ${formData.email}.`,
        "success"
      );
      navigate("/login", {
        state: { email: formData.email, verificationSent: true },
        replace: true,
      });
    } catch (err) {
      setError("Registration failed. Please try again.");
      showNotification("Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon="🧭"
      title="Create your account"
      subtitle="Set up your VoxTrail profile in minutes."
      backLink={{ to: "/", label: "← Back to home" }}
      footer={
        <Typography variant="body2" color="text.secondary" align="center">
          Already have an account? <Link to="/login">Sign in here</Link>
        </Typography>
      }
    >
      <Stack component="form" spacing={3} onSubmit={handleSubmit}>
        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{ borderRadius: 2 }}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="First name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              fullWidth
              disabled={loading}
            />
          </Grid>
        </Grid>

        <TextField
          label="Email address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          fullWidth
          disabled={loading}
        />

        <Stack spacing={2}>
          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            fullWidth
            disabled={loading}
            helperText="Use a strong password (see checklist below)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Stack spacing={0.5} component="ul" sx={{ listStyle: "none", pl: 0, mb: 0 }}>
            {passwordChecks.map((rule) => (
              <Typography
                key={rule.id}
                component="li"
                variant="body2"
                color={rule.valid ? "success.main" : "text.secondary"}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: rule.valid ? "success.main" : "text.disabled",
                    display: "inline-flex",
                  }}
                />
                {rule.label}
              </Typography>
            ))}
          </Stack>

          <TextField
            label="Confirm password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
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
        </Stack>

        <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Checkbox
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              disabled={loading}
              inputProps={{ "aria-label": "I agree to the Terms of Service and Privacy Policy." }}
              sx={{ mt: -1, ml: -1 }}
            />
            <Typography variant="body2" color="text.secondary">
              I agree to the <Link to="/terms" style={{ display: "inline-block" }}>Terms of Service</Link> and{" "}
              <Link to="/privacy" style={{ display: "inline-block" }}>Privacy Policy</Link>.
            </Typography>
        </Stack>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </Stack>
    </AuthShell>
  );
}
