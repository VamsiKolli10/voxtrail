import { Box, Chip, Container, Stack, Typography, alpha } from "@mui/material";

/**
 * Standard frame for in-app pages: one <h1>, consistent padding and width.
 *
 * variant="default"   Content pages (Home, Translate, Phrasebook…): lg width,
 *                     roomy padding, soft brand glow behind the header.
 * variant="fullBleed" Tool/detail pages (Stays, Explore, details): xl width,
 *                     tighter padding, no decoration, overflow visible so
 *                     sticky sidebars and maps work.
 */
export default function PageContainer({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  variant = "default",
  maxWidth,
  children,
  gap = 3,
  ...rest
}) {
  const fullBleed = variant === "fullBleed";
  const hasHeader = eyebrow || title || subtitle || meta || actions;

  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        py: fullBleed ? { xs: 2, md: 3 } : { xs: 4, md: 6 },
        overflow: fullBleed ? "visible" : "hidden",
        ...(!fullBleed && {
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: (theme) => {
              const glow = theme.vars
                ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.09)`
                : alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.09);
              return `radial-gradient(circle at 12% 0%, ${glow}, transparent 34%), ${(theme.vars || theme).palette.background.default}`;
            },
            zIndex: 0,
          },
        }),
      }}
      {...rest}
    >
      <Container
        maxWidth={maxWidth ?? (fullBleed ? "xl" : "lg")}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap,
          px: { xs: 2, sm: 3, md: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        {hasHeader && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              {eyebrow && (
                <Chip
                  label={eyebrow}
                  color="primary"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start", fontWeight: 600 }}
                />
              )}
              {title && (
                <Typography
                  component="h1"
                  variant="h4"
                  sx={{ fontWeight: 800, mb: subtitle ? 0.5 : 0, maxWidth: 720 }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body1" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
              {meta}
            </Stack>
            {actions && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                {actions}
              </Box>
            )}
          </Stack>
        )}
        {children}
      </Container>
    </Box>
  );
}
