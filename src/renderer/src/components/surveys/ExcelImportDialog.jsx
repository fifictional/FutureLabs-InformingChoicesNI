import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import CreateEventDialog from "../events/CreateEventDialog.jsx";
import EventSelectorAutocomplete from "../events/EventSelectorAutocomplete.jsx";

export default function ExcelImportDialog({
  open,
  onClose,
  importBusy,
  excelMeta,
  importFormName,
  setImportFormName,
  importEventName,
  setImportEventName,
  needsImportEvent,
  importErr,
  canDoImport,
  onSubmit,
}) {
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [pendingNewEventName, setPendingNewEventName] = useState("");
  const [eventSelectorReloadToken, setEventSelectorReloadToken] = useState(0);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Import survey from Excel</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            First row must be column titles (your questions). Each following row is one response.
            Optional columns: &quot;Form Name&quot;, &quot;Event Name&quot; (or &quot;Event&quot;),
            &quot;Timestamp&quot;.
          </Typography>

          {excelMeta && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              {excelMeta.questionHeaders?.length || 0} questions, {excelMeta.rowCount} rows
              {excelMeta.hasPerRowEvent ? " (event per row from sheet or default below)" : ""}
            </Typography>
          )}

          <TextField
            margin="dense"
            label="Survey Name"
            fullWidth
            value={importFormName}
            onChange={(e) => setImportFormName(e.target.value)}
          />

          <EventSelectorAutocomplete
            value={importEventName}
            onChange={setImportEventName}
            required={needsImportEvent}
            reloadToken={`${open}-${eventSelectorReloadToken}`}
            label={
              excelMeta?.hasPerRowEvent
                ? "Default event (for blank Event cells)"
                : "Event"
            }
            onAddRequested={(typedName) => {
              setPendingNewEventName(typedName || "");
              setCreateEventOpen(true);
            }}
            disabled={importBusy}
          />

          {importErr && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {importErr}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={importBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={!canDoImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        initialName={pendingNewEventName}
        title="Create Event"
        helperText="Create a new event and it will be selected for this import."
        onCreated={(event) => {
          if (event?.name) {
            setImportEventName(event.name);
          } else if (pendingNewEventName) {
            setImportEventName(pendingNewEventName);
          }
          setEventSelectorReloadToken((prev) => prev + 1);
        }}
      />
    </>
  );
}