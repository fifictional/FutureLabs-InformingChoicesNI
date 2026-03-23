import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Typography } from "@mui/material";
import { useState } from "react";

export default function DeleteSurveyDialog({ open, handleClose, survey, onDelete, ...props }) {    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deleteFromGoogle, setDeleteFromGoogle] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        try {
            if (deleteFromGoogle && survey.provider === "google_forms") {
                await window.api.googleForms.delete(survey.externalId);
            }

            await window.api.forms.delete(survey.id);
            if (onDelete) {
                onDelete();
            }
            handleClose();
        } catch (err) {
            setError('Failed to delete survey. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!survey) {
        return null;
    }

    return (
        <>
            <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
                <DialogTitle>Delete Survey</DialogTitle>
                <DialogContent>
                <Typography>Are you sure you want to delete the survey "{survey.name}"? This action cannot be undone.</Typography>
                {survey?.provider === "google_forms" && (
                    <>
                    {deleteFromGoogle === true ? (
                        <Typography mt={2} color="error">
                            Warning: This will permanently delete the form and all its responses from your Google Drive. This action cannot be undone.
                        </Typography>
                    ) : (
                    <Typography mt={2} color="textSecondary">
                        Note: This will only delete the survey from this application. The original form will still exist in your Google Drive.
                    </Typography>
                    )}
                    <FormControlLabel control={<Checkbox value={deleteFromGoogle} onChange={(e) => setDeleteFromGoogle(e.target.checked)} />} label="I also want to delete it from Google Drive" />

                    </>
                )}
                {error && <Typography color="error">{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} onClick={handleClose}>Cancel</Button>
                    <Button disabled={loading} color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
