import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

export default function CreateSurveyDialog({
  open,
  onClose,
  newSurveyName,
  setNewSurveyName,
  loading,
  error,
  onSubmit,
}) {
  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>Create New Survey</DialogTitle>
      <DialogContent>
        <Typography variant="body1" mb={1}>
          This action creates a new blank survey in your Google Drive with the given title and
          imports it into this app. You will then automatically be redirected to the Google Forms
          editor to customize your survey and add questions.
        </Typography>

        <TextField
          value={newSurveyName}
          onChange={(e) => setNewSurveyName(e.target.value)}
          fullWidth
          label="Survey Name"
          variant="outlined"
          margin="normal"
        />

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button disabled={loading} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!newSurveyName.trim() || loading}
          onClick={onSubmit}
          variant="contained"
          color="primary"
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}