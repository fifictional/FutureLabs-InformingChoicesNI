import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import slugify from "slugify";

export default function EditSurveyDialog({ open, handleClose, survey, onEdit, ...props }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newName, setNewName] = useState(survey?.name || '');
    const [newEventName, setNewEventName] = useState(survey?.eventName || '');

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const updatedEvent = await window.api.events.findByName(newEventName);
            if (!updatedEvent) {
                setError('Event with the specified name does not exist. Please enter a valid event name or create the event first.');
                setLoading(false);
                return;
            }

            await window.api.forms.update(survey.id, { name: newName, eventId: updatedEvent.id });
            if (onEdit) {
                onEdit();
            }
            handleClose();
        } catch (err) {
            setError('Failed to update survey. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (survey) {
            setNewName(survey.name);
            setNewEventName(survey.eventName || '');
            setError(null);
        }
    }, [survey]);
    
    if (!survey) {
        return null;
    }
    
    return (
        <>
            <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
                <DialogTitle>Edit Survey</DialogTitle>
                <DialogContent>
                    <Typography mb={2}>Edit survey details.</Typography>
                    <Stack spacing={2}>
                        <TextField value={newName} onChange={(e) => setNewName(e.target.value)} label="Survey Name" fullWidth />
                        <TextField value={newEventName} onChange={(e) => setNewEventName(e.target.value)} label="New Event Name" fullWidth />
                        {error && <Typography color="error">{error}</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} onClick={handleClose}>Cancel</Button>
                    <Button disabled={loading} variant="contained" onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
