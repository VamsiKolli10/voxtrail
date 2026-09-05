import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Fade,
  Grow,
  Button as MuiButton,
  useTheme,
  alpha,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import PageContainer from "../layout/PageContainer";
import Button from "../common/Button";
import { ModuleCard, ModuleCardGrid } from "../common/ModuleCard";
import { fetchProfile } from "../../services/user";
import { setUser } from "../../store/slices/authSlice";
import useTravelContext from "../../hooks/useTravelContext";
import { formatDestinationLabel } from "../../utils/destination";
import { readRecentActivity } from "../../utils/recentActivity";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const theme = useTheme();
  const [animationComplete, setAnimationComplete] = useState(false);
  const [recentActivity, setRecentActivity] = useState(() =>
    readRecentActivity(5)
  );

  useEffect(() => {
    fetchProfile()
      .then((resp) => dispatch(setUser(resp)))
      .catch((err) => {
        // Non-fatal: the user is already authenticated via AuthContext, this
        // just enriches the profile. Log rather than fail silently.
        console.error("Failed to refresh profile:", err);
      });
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => setRecentActivity(readRecentActivity(5));
    window.addEventListener("recent-activity-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("recent-activity-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }),
    []
  );

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const diff = timestamp - Date.now();
    const units = [
      { value: 60 * 60 * 24, unit: "day" },
      { value: 60 * 60, unit: "hour" },
      { value: 60, unit: "minute" },
      { value: 1, unit: "second" },
    ];
    const diffInSeconds = diff / 1000;
    for (const { value, unit } of units) {
      if (Math.abs(diffInSeconds) >= value || unit === "second") {
        return relativeTimeFormatter.format(
          Math.round(diffInSeconds / value),
          unit
        );
      }
    }
    return "";
  };

  const dashboardCards = [
    {
      title: "Translate",
      description: "Quick two‑pane translator with history.",
      icon: "🌐",
      path: "/translation",
      color: "#21808d",
    },
    {
      title: "Phrasebook",
      description: "Curate and organize common phrases by category.",
      icon: "📚",
      path: "/phrasebook",
      color: "#4a9ba8",
    },
    {
      title: "Destinations",
      description: "Explore popular places, trails, and museums.",
      icon: "📍",
      path: "/destinations",
      color: "#7b1fa2",
    },
    {
      title: "Cultural Guide",
      description: "Learn greetings, etiquette, and local customs.",
      icon: "🏛️",
      path: "/cultural-guide",
      color: "#f57c00",
    },
    {
      title: "Stays",
      description: "Browse accommodations with ratings and amenities.",
      icon: "🏨",
      path: "/stays",
      color: "#388e3c",
    },
    {
      title: "Emergency",
      description: "Find local emergency contacts and tips.",
      icon: "🚨",
      path: "/emergency",
      color: "#d32f2f",
    },
  ];

  const quickActions = [
    {
      label: "Quick Translate",
      icon: "⚡",
      action: () => navigate("/translation"),
    },
    { label: "Emergency", icon: "🆘", action: () => navigate("/emergency") },
    {
      label: "Find Places",
      icon: "🔍",
      action: () => navigate("/destinations"),
    },
  ];

  const {
    destinationCity,
    destinationState,
    destinationCountry,
    destinationDisplayName,
    destination,
  } = useTravelContext();

  const activityIcon = (type) => {
    switch (type) {
      case "translation":
        return "🌐";
      case "phrasebook":
        return "📚";
      case "stays":
        return "🏨";
      default:
        return "✨";
    }
  };

  const locationChipLabel =
    formatDestinationLabel({
      city: destinationCity || destinationDisplayName || destination,
      state: destinationState,
      country: destinationCountry,
      fallback: destinationDisplayName || destination,
    }) || "Set destination";

  if (!user) return null;

  return (
    <PageContainer
      title={`Welcome back, ${user?.user?.name || "traveler"}`}
      subtitle="Stay on top of your trip with quick access to every tool."
      actions={
        <Stack direction="row" spacing={1.5}>
          <Chip
            label={locationChipLabel}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip label="Safe travels!" color="secondary" variant="outlined" />
        </Stack>
      }
    >
      <Stack spacing={3}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            sx={{
              borderRadius: 3,
              background:
                "linear-gradient(135deg, rgba(33,128,141,0.08), rgba(94,82,64,0.08))",
              overflow: "visible",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                right: 0,
                width: 300,
                height: 200,
                background: `radial-gradient(circle, ${alpha(
                  theme.palette.primary.main,
                  0.15
                )} 0%, transparent 70%)`,
                pointerEvents: "none",
                opacity: 0.5,
                borderRadius: "50% 0 0 0",
                transform: "translate(20%, -20%)",
              },
            }}
          >
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Quick Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Jump straight into the tools you use the most.
                  </Typography>
                </Box>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 1.5 }}
                  sx={{
                    width: { xs: "100%", md: "auto" },
                    "& > *": { flexGrow: 1 },
                  }}
                >
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="contained"
                      color="primary"
                      onClick={action.action}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        whiteSpace: "nowrap",
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
                          transition: "left 0.5s",
                        },
                        "&:hover::after": {
                          left: "100%",
                        },
                      }}
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {animationComplete && (
            <ModuleCardGrid
              key="dashboard-cards"
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: theme.spacing(3),
                alignItems: "stretch",
              }}
            >
              {dashboardCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <ModuleCard
                    interactive
                    onClick={() => navigate(card.path)}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      border: "1px solid rgba(94,82,64,0.12)",
                      transition: "all 0.3s ease",
                      overflow: "hidden",
                      position: "relative",
                      minHeight: 220,
                      borderRadius: 24,
                      [theme.breakpoints.down("sm")]: {
                        minHeight: 200,
                      },
                      cursor: "pointer",
                      "&:hover": {
                        transform: "translateY(-8px)",
                        boxShadow: `0 8px 24px ${alpha(card.color, 0.2)}`,
                        borderColor: alpha(card.color, 0.3),
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${alpha(
                          card.color,
                          0.05
                        )} 0%, transparent 100%)`,
                        zIndex: 0,
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        height: "100%",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={card.icon}
                        sx={{
                          alignSelf: "flex-start",
                          fontSize: 20,
                          px: 1.5,
                          py: 0.5,
                          backgroundColor: `${card.color}18`,
                          color: card.color,
                          fontWeight: 600,
                        }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          {card.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {card.description}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "primary.main",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        Open →
                      </Typography>
                    </CardContent>
                  </ModuleCard>
                </motion.div>
              ))}
            </ModuleCardGrid>
          )}
        </AnimatePresence>

        <ModuleCardGrid
          sx={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          <ModuleCard
            sx={{
              border: "1px solid rgba(94,82,64,0.12)",
              backgroundColor: theme.palette.background.paper,
              position: "relative",
              overflow: "hidden",
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: "linear-gradient(90deg, #21808d, #4a9ba8, #21808d)",
                backgroundSize: "200% 200%",
                animation: "gradient 3s ease infinite",
                "@keyframes gradient": {
                  "0%": { backgroundPosition: "0% 50%" },
                  "50%": { backgroundPosition: "100% 50%" },
                  "100%": { backgroundPosition: "0% 50%" },
                },
              },
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <Stack spacing={1.5}>
                {recentActivity.length ? (
                  recentActivity.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.15, duration: 0.3 }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: "rgba(33,128,141,0.08)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "rgba(33,128,141,0.12)",
                            transform: "translateX(4px)",
                          },
                        }}
                      >
                        <Box sx={{ fontSize: 24 }}>
                          {activityIcon(item.type)}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.description || "Activity recorded"}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(item.timestamp)}
                        </Typography>
                      </Stack>
                    </motion.div>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recent activity yet. Start translating, generating
                    phrasebooks, or searching stays to see it here.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </ModuleCard>

          <ModuleCard
            sx={{
              border: "1px solid rgba(94,82,64,0.12)",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Travel Tips
              </Typography>
              <Stack spacing={1.5}>
                {[
                  {
                    icon: "💡",
                    text: "Save important phrases for offline access.",
                  },
                  {
                    icon: "📍",
                    text: "Share your location with trusted contacts.",
                  },
                  {
                    icon: "📱",
                    text: "Keep emergency contacts easily accessible.",
                  },
                ].map((tip, index) => (
                  <motion.div
                    key={tip.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.15, duration: 0.3 }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid rgba(94,82,64,0.12)",
                        backgroundColor: "rgba(94,82,64,0.04)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: "rgba(94,82,64,0.3)",
                          boxShadow: theme.shadows[2],
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <Box sx={{ fontSize: 24 }}>{tip.icon}</Box>
                      <Typography variant="body2">{tip.text}</Typography>
                    </Stack>
                  </motion.div>
                ))}
              </Stack>
            </CardContent>
          </ModuleCard>
        </ModuleCardGrid>
      </Stack>
    </PageContainer>
  );
}
