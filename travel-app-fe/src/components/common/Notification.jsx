import { Snackbar, Alert } from "@mui/material";

const SEVERITIES = ["error", "warning", "success", "info"];

/**
 * Toast. Timing is owned by useNotification / NotificationProvider, so the
 * Snackbar itself does not auto-hide.
 */
export default function Notification({
  message,
  type = "info",
  show = false,
  onClose,
}) {
  const severity = SEVERITIES.includes(type) ? type : "info";

  const handleClose = (_event, reason) => {
    if (reason === "clickaway") return;
    onClose?.();
  };

  return (
    <Snackbar
      open={show}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
        role={severity === "error" ? "alert" : "status"}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
