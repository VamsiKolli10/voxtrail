import { useEffect } from "react";
import { Button, Snackbar } from "@mui/material";
import { useRegisterSW } from "virtual:pwa-register/react";

// Registers the service worker (production only, see App.jsx) and offers a
// reload when a new version is waiting (ADR-006: registerType "prompt").
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn("Service worker registration failed", error);
    },
  });

  // A lazy route chunk from the old version may be gone after a deploy.
  // If the new version is already waiting, switch to it instead of failing.
  useEffect(() => {
    const onPreloadError = (event) => {
      if (!needRefresh) return;
      event.preventDefault();
      updateServiceWorker(true);
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, [needRefresh, updateServiceWorker]);

  return (
    <Snackbar
      open={needRefresh}
      message="A new version of VoxTrail is available."
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <>
          <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
            Later
          </Button>
          <Button
            color="secondary"
            size="small"
            variant="contained"
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
        </>
      }
    />
  );
}
