import React from "react";
import { Alert, AlertTitle, Box, Button } from "@mui/material";

function ErrorFallback({ error }) {
  const detail = import.meta.env?.DEV ? error?.message : null;
  return (
    <Box role="alert" sx={{ p: { xs: 2, md: 4 }, display: "grid", placeItems: "center" }}>
      <Alert
        severity="error"
        variant="outlined"
        sx={{ maxWidth: 560, width: "100%", alignItems: "flex-start" }}
        action={
          <Button color="error" size="small" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        }
      >
        <AlertTitle>Something went wrong</AlertTitle>
        {detail || "An unexpected error occurred. Reloading usually fixes it."}
      </Alert>
    </Box>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
