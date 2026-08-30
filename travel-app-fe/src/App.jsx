import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicRoute from "./components/common/PublicRoute";
import AppLayout from "./components/layout/AppLayout";
import { AppearanceProvider } from "./contexts/AppearanceContext.jsx";
import { FeatureFlagsProvider } from "./contexts/FeatureFlagsContext.jsx";
import { AnalyticsProvider } from "./contexts/AnalyticsContext.jsx";
import FeatureGate from "./components/common/FeatureGate.jsx";

const Landing = lazy(() => import("./components/pages/Landing"));
const Login = lazy(() => import("./components/pages/Login"));
const Register = lazy(() => import("./components/pages/Register"));
const ForgotPassword = lazy(() => import("./components/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./components/pages/ResetPassword"));
const AuthAction = lazy(() => import("./components/pages/AuthAction"));
const VerifyEmail = lazy(() => import("./components/pages/VerifyEmail"));
const LegalPage = lazy(() => import("./components/pages/LegalPage"));
const Home = lazy(() => import("./components/pages/Home.jsx"));
const Translation = lazy(() => import("./components/pages/Translation"));
const Phrasebook = lazy(() => import("./components/pages/Phrasebook"));
const Emergency = lazy(() => import("./components/pages/Emergency"));
const CulturalGuide = lazy(() => import("./components/pages/CulturalGuide"));
const StaysSearchPage = lazy(() => import("./components/pages/StaysSearchPage"));
const StayDetailsPage = lazy(() => import("./components/pages/StayDetailsPage"));
const DiscoverPage = lazy(() => import("./components/pages/DiscoverPage"));
const DestinationDetailsPage = lazy(() =>
  import("./components/pages/DestinationDetailsPage")
);

function RouteFallback() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: "50vh",
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress size={34} />
      <Typography color="text.secondary">Loading VoxTrail…</Typography>
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <FeatureFlagsProvider>
          <AnalyticsProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              {/* 🌐 Public routes */}
              <Route element={<PublicRoute />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth-action" element={<AuthAction />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              </Route>

              {/* 🔒 Protected routes (require auth) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route
                    path="/translation"
                    element={
                      <FeatureGate flag="translationModule">
                        <Translation />
                      </FeatureGate>
                    }
                  />
                  <Route path="/phrasebook" element={<Phrasebook />} />
                  <Route path="/emergency" element={<Emergency />} />
                  <Route path="/cultural-guide" element={<CulturalGuide />} />
                  <Route
                    path="/destinations"
                    element={
                      <FeatureGate flag="discoverModule">
                        <DiscoverPage />
                      </FeatureGate>
                    }
                  />

                  {/* 🧭 Discover (POIs) */}
                  <Route
                    path="/discover"
                    element={
                      <FeatureGate flag="discoverModule">
                        <DiscoverPage />
                      </FeatureGate>
                    }
                  />
                  <Route
                    path="/destinations/:id"
                    element={
                      <FeatureGate flag="discoverModule">
                        <DestinationDetailsPage />
                      </FeatureGate>
                    }
                  />

                  {/* 🏨 Stays (search + details) */}
                  <Route
                    path="/stays"
                    element={
                      <FeatureGate flag="staysModule">
                        <StaysSearchPage />
                      </FeatureGate>
                    }
                  />
                  <Route
                    path="/stays/:id"
                    element={
                      <FeatureGate flag="staysModule">
                        <StayDetailsPage />
                      </FeatureGate>
                    }
                  />

                  {/* 🔁 Redirect legacy path */}
                  <Route
                    path="/accommodation"
                    element={<Navigate to="/stays" replace />}
                  />

                  {/* 🚫 Fallback inside app */}
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Route>
              </Route>

              {/* 🌍 Global fallback for unauth routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AnalyticsProvider>
        </FeatureFlagsProvider>
      </AppearanceProvider>
    </AuthProvider>
  );
}
