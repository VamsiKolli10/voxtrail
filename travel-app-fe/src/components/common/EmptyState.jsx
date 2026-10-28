import { Box, Stack, Typography } from "@mui/material";

/**
 * Empty / zero-result state: icon, one-line title, short explanation, and
 * at most one action.
 *
 * variant="tint"  tinted panel (inside cards, lists)
 * variant="plain" no background (inside an already-tinted area)
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "tint",
  titleComponent = "h2",
  sx,
  ...rest
}) {
  return (
    <Box
      role="status"
      sx={[
        {
          textAlign: "center",
          py: { xs: 4, md: 5 },
          px: { xs: 2, md: 4 },
          borderRadius: 3,
          ...(variant === "tint" && { bgcolor: "surface.tint" }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      <Stack spacing={1} alignItems="center">
        {icon && (
          <Box
            aria-hidden="true"
            sx={{
              color: "text.secondary",
              display: "flex",
              mb: 0.5,
              "& .MuiSvgIcon-root": { fontSize: 40 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography component={titleComponent} variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        )}
        {action && <Box sx={{ pt: 1 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
