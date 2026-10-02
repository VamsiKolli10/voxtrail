import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme, alpha, Paper } from "@mui/material";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
        backgroundColor: theme.palette.background.default,
        overflowX: "hidden",
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          background: `radial-gradient(circle at 15% 10%, ${alpha(
            isDark ? theme.palette.primary.main : theme.palette.primary.light,
            isDark ? 0.15 : 0.12
          )} 0%, transparent 45%), radial-gradient(circle at 85% 0%, ${alpha(
            theme.palette.secondary.main,
            isDark ? 0.18 : 0.12
          )} 0%, transparent 55%)`,
          zIndex: 0,
          opacity: 0.7,
          pointerEvents: "none",
        },
        // Decorative elements
        "&::after": {
          content: '""',
          position: "fixed",
          bottom: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 0%, transparent 70%)`,
          zIndex: 0,
          pointerEvents: "none",
          [theme.breakpoints.down("md")]: {
            width: 200,
            height: 200,
            bottom: -50,
            right: -50,
          },
        },
      }}
    >
      <Navbar />
      <Box
        component="main"
        sx={{
          flex: 1,
          padding: { xs: 1.25, sm: 2.5, md: 3 },
          paddingBottom: isMobile ? "100px" : 3,
          minHeight: "calc(100vh - 64px)",
          width: "100%",
          maxWidth: "100%",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: { xs: 2.5, md: 4 },
            overflow: "hidden",
            backgroundColor: alpha(theme.palette.background.paper, 0.78),
            backdropFilter: "blur(14px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.07)}`,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Paper>
      </Box>
      <BottomNav />
    </Box>
  );
}
