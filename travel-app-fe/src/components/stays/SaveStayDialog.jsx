import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

export default function SaveStayDialog({
  stayName,
  initialValues,
  onSave,
  onClose,
}) {
  const [nickname, setNickname] = useState(initialValues?.nickname || "");
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (saving || !nickname.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ nickname: nickname.trim(), notes: notes.trim() });
      onClose();
    } catch (failure) {
      setError(
        failure?.response?.data?.error?.message ||
          "Could not save this stay. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="save-stay-title"
    >
      <Stack component="form" onSubmit={submit}>
        <DialogTitle id="save-stay-title">
          {initialValues ? "Edit saved stay" : "Save stay"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <DialogContentText>
              {stayName
                ? `Keep ${stayName} in your shortlist. `
                : "Keep this place in your shortlist. "}
              Give it your own nickname so you can recognize it later.
            </DialogContentText>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              label="Nickname"
              value={nickname}
              placeholder="Near the station"
              disabled={saving}
              onChange={(event) => setNickname(event.target.value)}
              inputProps={{ maxLength: 100 }}
              helperText={`${nickname.length}/100 characters`}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Notes (optional)"
              value={notes}
              placeholder="What would make this a good stay for your trip?"
              disabled={saving}
              onChange={(event) => setNotes(event.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${notes.length}/1000 characters`}
            />
            <DialogContentText variant="body2">
              Your nickname and notes are saved to your account. Open the stay
              to check current details.
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={saving}
            disabled={!nickname.trim()}
          >
            {initialValues ? "Save changes" : "Save stay"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
