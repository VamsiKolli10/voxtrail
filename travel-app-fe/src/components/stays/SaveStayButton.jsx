import { useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { BookmarkBorder, Bookmark } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useNotify } from "../../contexts/NotificationContext.jsx";
import useSavedStays from "../../hooks/useSavedStays";
import useConnectivity from "../../hooks/useConnectivity";
import SaveStayDialog from "./SaveStayDialog";

export default function SaveStayButton({ placeId, stayName, sx }) {
  const user = useAuth()?.user;
  const { notify } = useNotify();
  const { isOnline } = useConnectivity();
  const { items, loading, error, pending, saveStay, removeStay } =
    useSavedStays(user?.uid);
  const [editing, setEditing] = useState(false);
  const saved = items.some((item) => item.placeId === placeId);
  const label = `${saved ? "Remove saved stay" : "Save stay"}${stayName ? `: ${stayName}` : ""}`;
  const disabled =
    !user?.uid || !placeId || !isOnline || loading || Boolean(error) || pending;
  const tooltip = !isOnline
    ? "Connect to manage saved stays"
    : error
      ? "Saved stays could not load. Open Saved stays to retry."
      : label;
  const handleClick = async (event) => {
    event.stopPropagation();
    if (!saved) {
      setEditing(true);
      return;
    }
    try {
      await removeStay(placeId);
      notify("Stay removed from saved stays.", "success");
    } catch (failure) {
      notify(
        failure?.response?.data?.error?.message ||
          "Could not remove this stay. Please try again.",
        "error",
      );
    }
  };
  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <IconButton
            onClick={handleClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={saved}
            aria-haspopup={saved ? undefined : "dialog"}
            color={saved ? "primary" : "default"}
            sx={{ width: 44, height: 44, ...sx }}
          >
            {pending ? (
              <CircularProgress size={20} />
            ) : saved ? (
              <Bookmark />
            ) : (
              <BookmarkBorder />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {editing && (
        <SaveStayDialog
          key={`${user?.uid}:${placeId}`}
          stayName={stayName}
          onClose={() => setEditing(false)}
          onSave={async (values) => {
            await saveStay({ placeId, ...values });
            notify("Stay saved to your account.", "success");
          }}
        />
      )}
    </>
  );
}
