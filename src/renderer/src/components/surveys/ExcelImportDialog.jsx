import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

export default function ExcelImportDialog({
  open,
  onClose,
  importBusy,
  excelMeta,
  importFormName,
  setImportFormName,
  importEventName,
  setImportEventName,
  importEventDesc,
  setImportEventDesc,
  needsImportEvent,
  importErr,
  canDoImport,
  onSubmit,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import survey from Excel</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          First row must be column titles (your questions). Each following row is one response.
          Optional columns: &quot;Form Name&quot;, &quot;Event Name&quot; (or &quot;Event&quot;),
          &quot;Timestamp&quot;. New event names are created on the Events page automatically.
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

        <TextField
          margin="dense"
          label={excelMeta?.hasPerRowEvent ? "Default event name (for blank cells)" : "Event name"}
          fullWidth
          required={needsImportEvent}
          value={importEventName}
          onChange={(e) => setImportEventName(e.target.value)}
        />

        <TextField
          margin="dense"
          label="Event description (optional, only used when creating a new event)"
          fullWidth
          value={importEventDesc}
          onChange={(e) => setImportEventDesc(e.target.value)}
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
  );
}