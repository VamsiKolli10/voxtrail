import { Box, Chip, Container, Stack, Typography, alpha } from "@mui/material";

export default function PageContainer({
  eyebrow,
  title,
  subtitle,
  actions,
  maxWidth = "lg",
  children,
  gap = 3,
  ...rest
}) {
  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        py: { xs: 4, md: 6 },
        px: { xs: 0, md: 0 },
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: (theme) =>
            `radial-gradient(circle at 12% 0%, ${alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.12 : 0.09
            )}, transparent 34%), ${theme.palette.background.default}`,
          zIndex: 0,
        },
      }}
      {...rest}
    >
      <Container
        maxWidth={maxWidth}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap,
          px: { xs: 2, sm: 3, md: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        {(eyebrow || title || subtitle || actions) && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Stack spacing={1}>
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
              </Stack>
            </Box>
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
