import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import EventSelectorAutocomplete from "../events/EventSelectorAutocomplete.jsx";
import CreateEventDialog from "../events/CreateEventDialog.jsx";
import { fetchAllPages } from "../../common/pagination";

function normalizeSchema(schemaValue) {
    if (!schemaValue) return null;
    if (typeof schemaValue === "object") return schemaValue;
    if (typeof schemaValue !== "string") return null;
    try {
        return JSON.parse(schemaValue);
    } catch {
        return null;
    }
}

export default function EditSurveyDialog({ open, handleClose, survey, onEdit, ...props }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [referenceQuestions, setReferenceQuestions] = useState([]);
    const [loadingReferenceQuestions, setLoadingReferenceQuestions] = useState(false);
    const [newName, setNewName] = useState(survey?.name || '');
    const [newEventName, setNewEventName] = useState(survey?.eventName || '');
    const [newReferenceQuestionId, setNewReferenceQuestionId] = useState('');
    const [createEventOpen, setCreateEventOpen] = useState(false);
    const [pendingNewEventName, setPendingNewEventName] = useState('');
    const [eventSelectorReloadToken, setEventSelectorReloadToken] = useState(0);

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

            await window.api.forms.update(survey.id, {
                name: newName,
                eventId: updatedEvent.id,
                userReferenceQuestionId: newReferenceQuestionId ? Number(newReferenceQuestionId) : null
            });
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
        async function loadReferenceQuestions() {
            if (!open || !survey?.id) return;

            setLoadingReferenceQuestions(true);
            try {
                const allQuestions = await fetchAllPages((offset, limit) =>
                    window.api.questions.listByForm(survey.id, offset, limit)
                );
                const textQuestions = (Array.isArray(allQuestions) ? allQuestions : []).filter(
                    (question) => question.answerType === 'text'
                );

                const schema = normalizeSchema(survey?.schema);
                const presetDbId = schema?.userReferenceQuestionDbId;
                const legacyPresetId = Number(schema?.userReferenceQuestionId);

                setReferenceQuestions(textQuestions);

                if (presetDbId && textQuestions.some((q) => q.id === presetDbId)) {
                    setNewReferenceQuestionId(String(presetDbId));
                } else if (Number.isInteger(legacyPresetId) && textQuestions.some((q) => q.id === legacyPresetId)) {
                    setNewReferenceQuestionId(String(legacyPresetId));
                } else {
                    setNewReferenceQuestionId('');
                }
            } catch (err) {
                console.error(err);
                setReferenceQuestions([]);
                setNewReferenceQuestionId('');
                setError('Failed to load form questions.');
            } finally {
                setLoadingReferenceQuestions(false);
            }
        }

        if (survey) {
            setNewName(survey.name);
            setNewEventName(survey.eventName || '');
            setError(null);
            loadReferenceQuestions();
        }
    }, [open, survey]);
    
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
                        <EventSelectorAutocomplete
                            value={newEventName}
                            onChange={setNewEventName}
                            label="Event"
                            required
                            disabled={loading}
                            reloadToken={`${open}-${eventSelectorReloadToken}`}
                            onAddRequested={(typedName) => {
                                setPendingNewEventName(typedName || '');
                                setCreateEventOpen(true);
                            }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Reference ID Question"
                            value={newReferenceQuestionId}
                            onChange={(e) => setNewReferenceQuestionId(e.target.value)}
                            disabled={loading || loadingReferenceQuestions}
                            helperText={
                                loadingReferenceQuestions
                                    ? 'Loading text questions...'
                                    : 'Optional. Changing this will recalculate reference IDs for all existing submissions in this survey.'
                            }
                        >
                            <MenuItem value="">None</MenuItem>
                            {referenceQuestions.map((question) => (
                                <MenuItem key={question.id} value={String(question.id)}>
                                    {question.text}
                                </MenuItem>
                            ))}
                        </TextField>
                        {error && <Typography color="error">{error}</Typography>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} onClick={handleClose}>Cancel</Button>
                    <Button disabled={loading} variant="contained" onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>

            <CreateEventDialog
                open={createEventOpen}
                onClose={() => setCreateEventOpen(false)}
                initialName={pendingNewEventName}
                title="Create Event"
                helperText="Create a new event and it will be selected for this survey."
                onCreated={(event) => {
                    if (event?.name) {
                        setNewEventName(event.name);
                    } else if (pendingNewEventName) {
                        setNewEventName(pendingNewEventName);
                    }
                    setEventSelectorReloadToken((prev) => prev + 1);
                }}
            />
        </>
    )
}
