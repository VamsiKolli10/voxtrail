import { useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { MoreHoriz as MoreIcon } from "@mui/icons-material";
import { NavLink, useLocation } from "react-router-dom";
import {
  MOBILE_MORE,
  MOBILE_TABS,
  isNavItemActive,
} from "./navItems";

const MORE_VALUE = "more";

export default function BottomNav() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isMobile) return null;

  const activeTab = MOBILE_TABS.find((item) => isNavItemActive(item, pathname));
  const moreActive = MOBILE_MORE.some((item) => isNavItemActive(item, pathname));
  // `null` = nothing selected (e.g. a route that isn't in the nav).
  const value = activeTab ? activeTab.to : moreActive ? MORE_VALUE : null;

  return (
    <>
      <Paper
        component="nav"
        elevation={8}
        aria-label="Primary"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderTopLeftRadius: `${theme.radius.lg - 4}px`,
          borderTopRightRadius: `${theme.radius.lg - 4}px`,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflow: "hidden",
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(10px)",
          boxShadow: theme.customShadows.overlay,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation
          value={value}
          showLabels
          sx={{
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              color: "text.secondary",
              transition: `color ${theme.motion.duration.fast}ms ease`,
              "&.Mui-selected": { color: "primary.main" },
              "&.Mui-selected .MuiBottomNavigationAction-label": {
                fontWeight: 600,
              },
            },
          }}
        >
          {MOBILE_TABS.map(({ label, to, icon: Icon }) => (
            <BottomNavigationAction
              key={to}
              value={to}
              component={NavLink}
              to={to}
              label={label}
              icon={<Icon />}
            />
          ))}
          <BottomNavigationAction
            value={MORE_VALUE}
            label="More"
            icon={<MoreIcon />}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          />
        </BottomNavigation>
      </Paper>

      <Drawer
        anchor="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: `${theme.radius.lg}px`,
            borderTopRightRadius: `${theme.radius.lg}px`,
            pb: "calc(16px + env(safe-area-inset-bottom))",
            pt: 1,
          },
        }}
      >
        <Typography
          component="h2"
          variant="subtitle2"
          color="text.secondary"
          sx={{ px: 3, pt: 1.5, pb: 0.5 }}
        >
          More
        </Typography>
        <List aria-label="More sections">
          {MOBILE_MORE.map(({ label, to, icon: Icon }) => {
            const selected = isNavItemActive({ to }, pathname);
            return (
              <ListItemButton
                key={to}
                component={NavLink}
                to={to}
                selected={selected}
                onClick={() => setMoreOpen(false)}
                sx={{ px: 3, py: 1.5 }}
              >
                <ListItemIcon
                  sx={{ minWidth: 40, color: selected ? "primary.main" : "inherit" }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
