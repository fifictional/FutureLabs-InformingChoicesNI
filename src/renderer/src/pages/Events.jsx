import { Add, ArrowDropDown, Refresh } from "@mui/icons-material";
import { Box, Button, Chip, css, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Menu, MenuItem, setRef, Stack, TextField, Typography, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import ViewDescriptionDialog from "../components/events/ViewDescriptionDialog.jsx";
import DeleteEventDialog from "../components/events/DeleteEventDialog.jsx";
import EditTagsDialog from "../components/events/EditTagsDialog.jsx";
import EditEventDialog from "../components/events/EditEventDialog.jsx";
import ContainerWithBackground from "../components/common/ContainerWithBackground.jsx";

export default function Events() {
    const theme = useTheme();

    // data
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refresh, setRefresh] = useState(false);

    // event actions
    const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);
    const [actionsMenuOpened, setActionsMenuOpened] = useState(false);

    // create event
    const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [newEventCreationLoading, setNewEventCreationLoading] = useState(false);
    const [newEventCreationError, setNewEventCreationError] = useState(null);

    // event actions
    const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
    const [editTagsDialogOpen, setEditTagsDialogOpen] = useState(false);
    const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);

    // filter
    const [filterValue, setFilterValue] = useState('');


    const toolbarStyle = css`
        padding: 0.5em 0;
        box-sizing: border-box;
    `;

    const filterboxStyle = css`
        max-width: 300px;
        width: 100%;
        box-sizing: border-box;
        margin-right: 0.5em;    
            padding-top: 0;
            padding-bottom: 0;
    `;

    const handleActionsClick = (event) => {
        setActionsMenuAnchorEl(event.currentTarget);
        setActionsMenuOpened(true);
    }

    const handleEventCreation = async () => {
        setNewEventCreationLoading(true);
        setNewEventCreationError(null);

        try {
            await window.api.events.create({
                name: newEventName,
                description: newEventDescription});
            setCreateEventDialogOpen(false);
            setRefresh(prev => !prev);
        } catch (error) {
            console.error('Error creating event:', error);
            setNewEventCreationError('Failed to create event. Make sure the event name is unique.');
        } finally {
            setNewEventCreationLoading(false);
        }
    }

    const dataGridRows = useMemo(() => 
    {
        if (!events) return [];

        return events
            .map(event => ({
                id: event.id,
                event: event,
                name: event.name,
                description: event.description,
                tags: event.tags,
                surveys: event.surveyCount
            }))
            .filter(event => 
                event.name.toLowerCase().includes(filterValue.toLowerCase()) 
                || event.tags.toLowerCase().includes(filterValue.toLowerCase())
                || event.description.toLowerCase().includes(filterValue.toLowerCase())) 
            || [];
    }, [events, filterValue]);

    useEffect(() => {
        async function fetchEvents() {
            setLoading(true);
            setError(null);
            try {
                const events = await window.api.events.listWithSurveyCountsAndTags();
                setEvents(events);
            } catch (error) {
                console.error('Error fetching events:', error);
                setError('Failed to load events. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        fetchEvents();
    }, [refresh]);
    
    const dataGridColumns = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'tags', headerName: 'Tags', width: 400, renderCell: (params) => 
        <>
            {params.row.tags.length > 0 ? params.row.tags.map((tag) => (
                <Chip key={tag} variant="outlined" color="primary" label={tag} />
            )) : "No Tags"}
        </>},
        { field: 'surveys', headerName: 'Surveys', width: 120 },
        { field: 'description', headerName: 'Description', width: 120, renderCell: (params) => <ViewDescriptionDialog name={params.row.name} description={params.row.description} /> },
    ];

    return (
        <>
        <ContainerWithBackground>
            <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                <Typography flex={1} variant="h5" fontWeight="bold" mb={3} color="#000000">
                Events
                </Typography>
                
                <Button 
                    onClick={handleActionsClick}
                    variant="contained" 
                    color={theme.palette.primary.accent} 
                    endIcon={<ArrowDropDown />}>
                    Event Actions
                </Button>
                <Menu label="Actions" anchorEl={actionsMenuAnchorEl} open={actionsMenuOpened} onClose={() => setActionsMenuOpened(false)}>
                    <MenuItem disabled={!selectedEvent} onClick={() => setEditEventDialogOpen(true)} value="edit-event">Edit Event</MenuItem>
                    <MenuItem disabled={!selectedEvent} onClick={() => setEditTagsDialogOpen(true)} value="edit-tags">Edit Tags</MenuItem>
                    <MenuItem disabled={!selectedEvent} onClick={() => setDeleteEventDialogOpen(true)} value="delete">Delete</MenuItem>
                </Menu>
                <DeleteEventDialog onDelete={() => { setRefresh(prev => !prev); setActionsMenuOpened(false); } } event={dataGridRows.find(row => row.id === selectedEvent)?.event} open={deleteEventDialogOpen} handleClose={() => setDeleteEventDialogOpen(false)} />
                <EditTagsDialog onEdit={() => {setRefresh(prev => !prev); setActionsMenuOpened(false);}} event={dataGridRows.find(row => row.id === selectedEvent)?.event} open={editTagsDialogOpen} handleClose={() => setEditTagsDialogOpen(false)} />
                <EditEventDialog onEdit={() => {setRefresh(prev => !prev); setActionsMenuOpened(false);}} event={dataGridRows.find(row => row.id === selectedEvent)?.event} open={editEventDialogOpen} handleClose={() => setEditEventDialogOpen(false)} />
                <Button variant="contained" color="accent" endIcon={<Add />} onClick={() => setCreateEventDialogOpen(true)}>
                    Create New Event
                </Button>
                <Dialog fullWidth maxWidth="sm" open={createEventDialogOpen} onClose={() => setCreateEventDialogOpen(false)}>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogContent>
                        <Typography mb={2}>Create a new event to group related surveys and feedback together. You can tag events to associate them to one another and later filter the events and surveys by the tags.</Typography>
                        <Stack spacing={2}>
                            <TextField onChange={(e) => setNewEventName(e.target.value)} label="Event Name" fullWidth />
                            <TextField onChange={(e) => setNewEventDescription(e.target.value)} label="Description (Optional)" fullWidth multiline rows={4} />
                            {newEventCreationError && <Typography color="error">{newEventCreationError}</Typography>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={newEventCreationLoading} onClick={() => setCreateEventDialogOpen(false)}>Cancel</Button>
                        <Button disabled={!newEventName || newEventCreationLoading} variant="contained" color="primary" onClick={() => handleEventCreation()}>Create</Button>
                    </DialogActions>
                </Dialog>
            </Stack>
            <Divider />
            <Stack css={toolbarStyle} direction="row" alignItems="center">
                <TextField 
                    aria-label="filter events" 
                    placeholder="Search..." 
                    size="small" 
                    variant="outlined" 
                    css={filterboxStyle}
                    onChange={(e) => setFilterValue(e.target.value)}
                />
                <Button 
                    color="primary" 
                    onClick={() => setRefresh(prev => !prev)} 
                    variant="outlined"
                    startIcon={<Refresh />}
                >
                    Refresh
                </Button>   
            </Stack>

            <DataGrid 
                autoHeight 
                columns={dataGridColumns} 
                rows={dataGridRows}
                onRowSelectionModelChange={(newSelection) => setSelectedEvent(newSelection.ids?.values().next().value || null)}
            />
        </ContainerWithBackground>
        </>
    )
}