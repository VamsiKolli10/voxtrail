import {
  Box,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
  Tooltip,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Brightness4 as DarkIcon, Brightness7 as LightIcon } from "@mui/icons-material";
import { useAppearance } from "../../contexts/AppearanceContext.jsx";

export default function AuthShell({
  title,
  subtitle,
  icon,
  footer,
  children,
  maxWidth = "sm",
  backLink,
}) {
  const theme = useTheme();
  const { mode, toggleMode } = useAppearance();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.primary.light}14, ${theme.palette.secondary.light}14)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 6, md: 8 },
        px: { xs: 2, sm: 4 },
        color: theme.palette.text.primary,
      }}
    >
      <Container maxWidth={maxWidth} sx={{ px: 0 }}>
        <Stack spacing={3} alignItems="stretch">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: { xs: 0.5, sm: 1 } }}
          >
            {backLink ? (
              <Typography
                component={RouterLink}
                to={backLink.to}
                variant="body2"
                sx={{
                  textDecoration: "none",
                  color: "text.secondary",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  "&:hover": { color: "primary.main" },
                }}
              >
                {backLink.label}
              </Typography>
            ) : (
              <Box />
            )}
            <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton
                onClick={toggleMode}
                sx={{
                  borderRadius: 2,
                  border: (theme) => `1px solid ${theme.palette.border.subtle}`,
                  backgroundColor: "background.paper",
                }}
              >
                {mode === "dark" ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              p: { xs: 3, sm: 4 },
              border: (theme) => `1px solid ${theme.palette.border.subtle}`,
              boxShadow: (theme) => theme.customShadows.card,
              backgroundColor: "background.paper",
              color: "text.primary",
            }}
          >
            <Stack spacing={3}>
              {(icon || title || subtitle) && (
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  {icon && (
                    <Box
                      sx={{
                        fontSize: 40,
                        lineHeight: 1,
                      }}
                    >
                      {icon}
                    </Box>
                  )}
                  {title && (
                    <Typography component="h1" variant="h4" sx={{ fontWeight: 600 }}>
                      {title}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography variant="body1" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </Stack>
              )}
              <Box component="div">{children}</Box>
            </Stack>
          </Paper>
          {footer}
        </Stack>
      </Container>
    </Box>
  );
}
