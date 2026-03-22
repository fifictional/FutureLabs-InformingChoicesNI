import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import slugify from "slugify";


export default function EditTagsDialog({ open, handleClose, event, onEdit, ...props }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newTagName, setNewTagName] = useState('');
    const [eventTags, setEventTags] = useState([]);

    useEffect(() => {
        if (!event || !event.id) {
            setEventTags([]);
            setNewTagName("");
            setError(null);
            return;
        }

        async function fetchEventTags() {
            try {
                const tags = await window.api.eventTags.listForEvent(event.id);
                setEventTags(tags);
            } catch (err) {
                console.error('Failed to fetch event tags:', err);
                setError('Failed to load tags for this event. Please try again.');
            }
        }
        fetchEventTags();
    }, [event]);

    const onTagDelete = async (tagId) => {
        setError(null);
        try {
            await window.api.eventTags.removeFromEvent(event.id, tagId);
            setEventTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
        } catch (err) {
            console.error('Failed to delete tag:', err);
            setError('Failed to delete tag. Please try again.');
        } finally {
            setLoading(false);
            onEdit();
        }
    };

    const onTagAdd = async () => {
        if (!newTagName.trim()) {
            setError('Tag name cannot be empty.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const slug = slugify(newTagName, { lower: true, strict: true });
            const existingTag = await window.api.eventTags.findBySlug(slug);
            let tag;

            if (existingTag) {
                tag = existingTag;
            } else {
                const [createdTag] = await window.api.eventTags.create({ name: newTagName, slug });
                tag = createdTag;
            }

            await window.api.eventTags.addToEvent(event.id, tag.id);
            setEventTags(prevTags => [...prevTags, tag]);
            setNewTagName('');
        } catch (err) {
            console.error('Failed to add tag:', err);
            setError('Failed to add tag. Please try again.');
        } finally {
            setLoading(false);
            onEdit();
        }
    };

    
    if (!event) {
        return null;
    }

    return (
        <>
        <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
            <DialogTitle>
                Edit Tags for "{event.name}"
            </DialogTitle>
            <DialogContent>
                <Stack direction="row" spacing={2} alignItems="center" my={1}>
                    <TextField value={newTagName} size="small" onChange={(e) => setNewTagName(e.target.value)} label="New Tag Name" />
                    <Button disabled={!newTagName.trim()} onClick={() => onTagAdd()} variant="contained" color="primary">
                        Add Tag
                    </Button>
                </Stack>
                {error && <Typography color="error">{error}</Typography>}
                <Typography variant="h6" mt={2}>Current Tags:</Typography>
                {eventTags.length === 0 ? (
                    <Typography>No tags assigned to this event.</Typography>
                ) : (
                    eventTags.map((tag) => (
                        <Chip key={tag.id} variant="outlined" color="primary" label={tag.name} onDelete={() => onTagDelete(tag.id)} />
                    ))
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
        </>
    )
}