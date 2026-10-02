import { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
  alpha,
  Divider,
  Stack,
  Button,
} from "@mui/material";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import LogoutButton from "../../components/common/LogoutButton";
import { useSelector } from "react-redux";
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  AirplanemodeActive as PlaneIcon,
} from "@mui/icons-material";
import { useAppearance } from "../../contexts/AppearanceContext.jsx";
import { NAV_ITEMS, isNavItemActive } from "./navItems";
import { transitionFor } from "../../theme";


const StyledLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.primary,
  textDecoration: "none",
  fontSize: "17px",
  fontWeight: 800,
  position: "relative",
  paddingRight: theme.spacing(2),
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: -4,
    left: 0,
    width: "100%",
    height: 2,
    backgroundColor: theme.palette.primary.main,
    transform: "scaleX(0)",
    transformOrigin: "right",
    transition: transitionFor("transform"),
  },
  "&:hover::after": {
    transform: "scaleX(1)",
    transformOrigin: "left",
  },
}));

const StyledNavLink = styled(NavLink)(({ theme }) => ({
  color: theme.palette.text.primary,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.88rem",
  padding: "9px 13px",
  borderRadius: "10px",
  position: "relative",
  transition: transitionFor("color", "fast"),
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 6,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: theme.palette.primary.main,
    transform: "scaleX(0)",
    transformOrigin: "left",
    transition: transitionFor("transform"),
  },
  "&:hover": {
    color: theme.palette.primary.main,
    "&::after": {
      transform: "scaleX(1)",
    },
  },
  "&.active": {
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    "&::after": {
      transform: "scaleX(1)",
    },
  },
}));

export default function Navbar({ isLanding = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { mode, toggleMode } = useAppearance();
  const navRefs = useRef([]);
  const [focusedNavIndex, setFocusedNavIndex] = useState(0);

  useEffect(() => {
    const idx = NAV_ITEMS.findIndex((item) =>
      isNavItemActive(item, location.pathname)
    );
    if (idx >= 0) {
      setFocusedNavIndex(idx);
    }
  }, [location.pathname]);

  const handleNavKeyDown = (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (focusedNavIndex + delta + NAV_ITEMS.length) % NAV_ITEMS.length;
    setFocusedNavIndex(nextIndex);
    const nextNode = navRefs.current[nextIndex];
    nextNode?.focus();
  };

  return (
    <AppBar
      component="header"
      position={isLanding ? "absolute" : "sticky"}
      elevation={isLanding ? 0 : 1}
      sx={{
        backdropFilter: "blur(8px)",
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        transition: transitionFor("all"),
      }}
    >
      <Toolbar
        component="div"
        role="navigation"
        aria-label="Main site controls"
        sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 64, md: 72 } }}
      >
        <StyledLink
          to={user ? "/home" : "/"}
          aria-label="VoxTrail home"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlaneIcon fontSize="small" sx={{ color: "primary.contrastText" }} />
            </Box>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.04em",
                background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              VoxTrail
            </Typography>
          </Stack>
        </StyledLink>

        {!isMobile && user && !isLanding && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Box
              component="nav"
              aria-label="Primary sections"
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                gap: 0.5,
              }}
              onKeyDown={handleNavKeyDown}
            >
              {NAV_ITEMS.map((link, index) => (
                <StyledNavLink
                  key={link.to}
                  to={link.to}
                  className={
                    isNavItemActive(link, location.pathname) ? "active" : undefined
                  }
                  ref={(node) => {
                    navRefs.current[index] = node;
                  }}
                  onFocus={() => setFocusedNavIndex(index)}
                >
                  {link.label}
                </StyledNavLink>
              ))}
            </Box>
          </>
        )}

        <Box
          sx={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Tooltip
            title={
              mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <IconButton
              onClick={toggleMode}
              aria-label={
                mode === "dark" ? "Activate light mode" : "Activate dark mode"
              }
              color="inherit"
              sx={{
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                backgroundColor: "background.paper",
                transition: transitionFor("all"),
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {mode === "dark" ? (
                <LightIcon fontSize="small" />
              ) : (
                <DarkIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          {isLanding ? (
            <>
              <Button variant="outlined" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button variant="contained" onClick={() => navigate("/register")}>
                Join free
              </Button>
            </>
          ) : (
            user && <LogoutButton />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
