import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";


export default function EditEventDialog({ open, handleClose, event, onEdit, ...props }) {
    const [newEventName, setNewEventName] = useState(event?.name || '');
    const [newEventDescription, setNewEventDescription] = useState(event?.description || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            await window.api.events.update(event.id, { name: newEventName, description: newEventDescription });
            if (onEdit) {
                onEdit();
            }
            handleClose();
        } catch (err) {
            setError('Failed to update event. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (event) {
            setNewEventName(event.name);
            setNewEventDescription(event.description || '');
            setError(null);
        }
    }, [event]);    

    if (!event) {
        return null;
    }

    return (
        <>
        <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogContent>
                <Typography mb={2}>Edit event details.</Typography>
                <Stack spacing={2}>
                    <TextField value={newEventName} onChange={(e) => setNewEventName(e.target.value)} label="Event Name" fullWidth />
                    <TextField value={newEventDescription} onChange={(e) => setNewEventDescription(e.target.value)} label="Description (Optional)" fullWidth multiline rows={4} />
                    {error && <Typography color="error">{error}</Typography>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={loading} onClick={() => handleClose()}>Cancel</Button>
                <Button disabled={!newEventName || loading} variant="contained" color="primary" onClick={() => handleSave()}>Save</Button>
            </DialogActions>
        </Dialog>
        </>
    )
}