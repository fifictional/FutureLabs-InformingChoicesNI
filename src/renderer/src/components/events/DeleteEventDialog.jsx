import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useState } from "react";


export default function DeleteEventDialog({ open, handleClose, event, onDelete, ...props }) {
    if (!event) {
        return null;
    }
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        try {
            await window.api.events.delete(event.id);
            if (onDelete) {
                onDelete();
            }
            handleClose();
        } catch (err) {
            setError('Failed to delete event. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
                <DialogTitle>Delete Event</DialogTitle>
                <DialogContent>
                {event.surveyCount > 0 ? (
                    <Typography color="error">Warning: This event has {event.formCount} associated survey(s). In order to protect data, you cannot delete this event until all of its surveys are either deleted or moved to other events.</Typography>
                ) :
                    <Typography>Are you sure you want to delete the event "{event.name}"? This action cannot be undone.</Typography>
                }
                {error && <Typography color="error">{error}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} onClick={handleClose}>Cancel</Button>
                    <Button disabled={event.surveyCount > 0 || loading} color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
