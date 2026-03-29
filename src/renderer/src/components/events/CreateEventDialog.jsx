import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

export default function CreateEventDialog({
  open,
  onClose,
  onCreated,
  initialName = "",
  title = "Create New Event",
  helperText,
}) {
  const [newEventName, setNewEventName] = useState(initialName);
  const [newEventDescription, setNewEventDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNewEventName(initialName || "");
    setNewEventDescription("");
    setError("");
  }, [open, initialName]);

  async function handleCreate() {
    const name = newEventName.trim();
    if (!name) {
      setError("Event name is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const created = await window.api.events.create({
        name,
        description: newEventDescription.trim() || null,
      });
      const createdEvent = Array.isArray(created) ? created[0] : created;
      if (onCreated) {
        onCreated(createdEvent || { name });
      }
      onClose();
    } catch {
      setError("Failed to create event. Make sure the event name is unique.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={() => !busy && onClose()}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {helperText ? <Typography mb={2}>{helperText}</Typography> : null}
        <Stack spacing={2}>
          <TextField
            label="Event Name"
            fullWidth
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            disabled={busy}
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={4}
            value={newEventDescription}
            onChange={(e) => setNewEventDescription(e.target.value)}
            disabled={busy}
          />
          {error ? <Typography color="error">{error}</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!newEventName.trim() || busy}
          variant="contained"
          color="primary"
          onClick={handleCreate}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
