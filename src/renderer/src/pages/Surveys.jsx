import { Autocomplete, Box, Button, css, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useTheme } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleFormPicker } from "../components/google-forms/GoogleFormPicker";
import LaunchIcon from '@mui/icons-material/Launch';
import { CloudDownload, Refresh, UploadFile } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";

export default function Surveys() {
    const theme = useTheme();

    // data    
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refresh, setRefresh] = useState(false);

    // actions menu
    const [actionsMenuOpened, setActionsMenuOpened] = useState(false);
    const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);

    // sort and filter 
    const [filterValue, setFilterValue] = useState('');

    // import menu
    const [googleFormPickerOpen, setGoogleFormPickerOpen] = useState(false);
    const [importMenuOpened, setImportMenuOpened] = useState(false);
    const [importMenuAnchorEl, setImportMenuAnchorEl] = useState(null);

    // create new survey
    const [createSurveyDialogOpen, setCreateSurveyDialogOpen] = useState(false);
    const [newSurveyName, setNewSurveyName] = useState('');
    const [newSurveyCreationLoading, setNewSurveyCreationLoading] = useState(false);
    const [newSurveyCreationError, setNewSurveyCreationError] = useState(null);

    // excel import
    const excelFileInputRef = useRef(null);
    const [excelImportOpen, setExcelImportOpen] = useState(false);
    const [excelBuffer, setExcelBuffer] = useState(null);
    const [excelMeta, setExcelMeta] = useState(null);
    const [importFormName, setImportFormName] = useState('');
    const [importEventName, setImportEventName] = useState('');
    const [importEventDesc, setImportEventDesc] = useState('');
    const [importBusy, setImportBusy] = useState(false);
    const [importErr, setImportErr] = useState('');

    useEffect(() => {
        if (excelImportOpen && excelMeta) {
            setImportFormName(excelMeta.suggestedFormName || '');
            setImportEventName(excelMeta.suggestedEventName || '');
            setImportEventDesc('');
            setImportErr('');
        }
    }, [excelImportOpen, excelMeta]);

    useEffect(() => {
        async function fetchForms() {
            setLoading(true);
            try {
                const formList = await window.api.forms.listWithEventNameAndResponseCount();
                setForms(formList);
            } catch (err) {
                console.error('Failed to fetch forms', err);
                window.alert('Failed to fetch forms. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        fetchForms();
    }, [refresh]);

    const providerToSource = (form) => {
        switch (form.provider) {
            case 'google_forms':
                return 'Google Forms';
            case 'local':
                return 'Local' + (form?.schema?.source ? ` (${form.schema.source})` : '');
            default:
                return form.provider || 'Unknown';
        }
    };

    const buildRows = useMemo(() => {
        return forms.map(form => ({
            id: form.id,
            name: form.name,
            event: form.eventName || '',
            source: providerToSource(form) || 'Unknown',
            ResponseCount: form.responseCount || 0,
            webViewLink: form.baseLink || ''
        }));
    }, [forms]);

    async function handleExcelFileChosen(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const buf = await file.arrayBuffer();
            const res = await window.api.surveys.parseExcelImport(buf);
            if (!res.ok) {
                window.alert(res.error || 'Could not read Excel file');
                return;
            }
            setExcelBuffer(buf);
            setExcelMeta(res);
            setExcelImportOpen(true);
        } catch (err) {
            window.alert(err?.message || String(err));
        }
    }

    async function handleExcelImportSubmit() {
        setImportBusy(true);
        setImportErr('');
        const res = await window.api.surveys.commitExcelImport({
            buffer: excelBuffer,
            formName: importFormName.trim(),
            eventName: importEventName.trim(),
            eventDescription: importEventDesc.trim() || undefined
        });
        setImportBusy(false);
        if (!res.ok) {
            setImportErr(res.error || 'Import failed');
            return;
        }
        window.alert('Import finished.');
        setExcelImportOpen(false);
        setExcelBuffer(null);
        setExcelMeta(null);
    }

    const needsImportEvent = !excelMeta?.hasPerRowEvent;
    const canDoImport =
        importFormName.trim() !== '' &&
        (!needsImportEvent || importEventName.trim() !== '') &&
        !importBusy &&
        excelBuffer;

    const handleActionsClick = (event) => {
        setActionsMenuAnchorEl(event.currentTarget);
        setActionsMenuOpened(true);
    };

    const handleImportClick = (event) => {
        setImportMenuAnchorEl(event.currentTarget);
        setImportMenuOpened(true);
    };

    const handleCreateSurveySubmit = async () => {
        setNewSurveyCreationLoading(true);
        setNewSurveyCreationError(null);
        if (!newSurveyName.trim()) return;
        try {
            const newForm = await window.api.googleForms.create(newSurveyName.trim(), newSurveyName.trim());
            setCreateSurveyDialogOpen(false);
            setNewSurveyName('');
            window.api.googleForms.openInBrowser(newForm.formId);
        } catch (err) {
            setNewSurveyCreationError('Failed to create survey. Please try again.');
        } finally {
            setNewSurveyCreationLoading(false);
        }
    };

  const backgroundStyle = css`
    background-color: #f5f5f5;
    width: 100%;
    height: 100%;
  `;    

  const containerStyle = css`
    margin: 0 auto;
    padding: 2rem;
  `;
  
    const toolbarStyle = css`
        padding: 0.5em 0;
        box-sizing: border-box;
    `;

    const filterboxStyle = css`
        max-width: 300px;
        width: 100%;
        box-sizing: border-box;
        margin-right: 0.5em;    

        & .MuiInputBase-root {
            padding-top: 0;
            padding-bottom: 0;
        }
    `;

    const filterOptions = useMemo(() => {
        return forms.map(form => ({
            id: form.id,
            label: form.name || "Untitled Form"
        }));
    }, [forms]);

    const dataGridColumns = [
        { field: 'name', headerName: 'Name', flex: 1 },
        { field: 'event', headerName: 'Event', width: 300 },
        { field: "source", headerName: "Source", width: 150 },
        { field: 'ResponseCount', headerName: 'Responses', width: 120 },
        { field: 'webViewLink', headerName: 'Link', width: 100, renderCell: (params) => (
            <IconButton 
                color="primary" 
                onClick={() => window.open(params.value, '_blank')}
            >
                <LaunchIcon />
            </IconButton>
        )}
    ];

    return (
        <>
        <Box css={backgroundStyle}>
            <Box css={containerStyle}>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                    <Typography flex={1} variant="h5" fontWeight="bold" mb={3} color="#000000">
                    Surveys
                    </Typography>
                    <Button 
                        onClick={handleActionsClick}
                        variant="contained" 
                        color={theme.palette.primary.accent} 
                        endIcon={<ArrowDropDownIcon />}>
                        Survey Actions
                    </Button>
                    <Menu label="Actions" anchorEl={actionsMenuAnchorEl} open={actionsMenuOpened} onClose={() => setActionsMenuOpened(false)}>
                        <MenuItem disabled={!selectedSurvey} value="view-data">View Data</MenuItem>
                        <MenuItem disabled={!selectedSurvey} value="view-on-browser">View on Browser</MenuItem>
                        <MenuItem disabled={!selectedSurvey} value="edit">Edit</MenuItem>
                        <MenuItem disabled={!selectedSurvey} value="delete">Delete</MenuItem>
                    </Menu>
                    <Button variant="contained" endIcon={<AddIcon />} onClick={() => setCreateSurveyDialogOpen(true)}>
                        Create New Survey
                    </Button>
                    <Dialog fullWidth maxWidth="sm" open={createSurveyDialogOpen} onClose={() => setCreateSurveyDialogOpen(false)}>
                        <DialogTitle>Create New Survey</DialogTitle>
                        <DialogContent>
                            <Typography variant="body1" mb={1}>
                                This action creates a new blank survey in your Google Drive with the given title and imports it into this app. You will then automatically be redirected to the Google Forms editor to customize your survey and add questions.
                            </Typography>
                            <TextField onChange={(e) => setNewSurveyName(e.target.value)} fullWidth label="Survey Name" variant="outlined" margin="normal" />
                            {newSurveyCreationError && <Typography color="error" variant="body2">{newSurveyCreationError}</Typography>}
                        </DialogContent>
                        <DialogActions>
                            <Button disabled={newSurveyCreationLoading} onClick={() => setCreateSurveyDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={!newSurveyName || newSurveyCreationLoading} onClick={() => handleCreateSurveySubmit()} variant="contained" color="primary">
                                Create
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Button 
                        onClick={handleImportClick}
                        variant="contained" 
                        color="accent"
                        endIcon={<ArrowDropDownIcon />}>
                        Import Surveys
                    </Button>
                    <Menu label="Actions" anchorEl={importMenuAnchorEl} open={importMenuOpened} onClose={() => setImportMenuOpened(false)}>
                        <MenuItem value="from-google-drive" onClick={() => setGoogleFormPickerOpen(true)}>
                            <ListItemIcon>
                                <CloudDownload />
                            </ListItemIcon> 
                            <ListItemText>
                                From Google Drive 
                            </ListItemText>
                        </MenuItem>
                        <MenuItem
                            value="upload-file"
                            onClick={() => {
                                setImportMenuOpened(false);
                                excelFileInputRef.current?.click();
                            }}
                        >
                            <ListItemIcon>
                                <UploadFile />
                            </ListItemIcon> 
                            <ListItemText>
                                Upload File 
                            </ListItemText>
                        </MenuItem>
                    </Menu>
                    <input
                        ref={excelFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        style={{ display: 'none' }}
                        onChange={handleExcelFileChosen}
                    />
                    <Dialog open={excelImportOpen} onClose={() => { if (!importBusy) { setExcelImportOpen(false); setExcelBuffer(null); setExcelMeta(null); } }} fullWidth maxWidth="sm">
                        <DialogTitle>Import survey from Excel</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                First row must be column titles (your questions). Each following row is one response. Optional
                                columns: &quot;Form Name&quot;, &quot;Event Name&quot; (or &quot;Event&quot;), &quot;Timestamp&quot;.
                                New event names are created on the Events page automatically.
                            </Typography>
                            {excelMeta && (
                                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                    {excelMeta.questionHeaders?.length || 0} questions, {excelMeta.rowCount} rows
                                    {excelMeta.hasPerRowEvent ? ' (event per row from sheet or default below)' : ''}
                                </Typography>
                            )}
                            <TextField margin="dense" label="Survey Name" fullWidth value={importFormName} onChange={(e) => setImportFormName(e.target.value)} />
                            <TextField
                                margin="dense"
                                label={excelMeta?.hasPerRowEvent ? 'Default event name (for blank cells)' : 'Event name'}
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
                            {importErr && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{importErr}</Typography> }
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => { if (!importBusy) { setExcelImportOpen(false); setExcelBuffer(null); setExcelMeta(null); } }} disabled={importBusy}>Cancel</Button>
                            <Button variant="contained" onClick={handleExcelImportSubmit} disabled={!canDoImport}>Import</Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog open={googleFormPickerOpen} onClose={() => setGoogleFormPickerOpen(false)} fullWidth maxWidth="lg">
                        <GoogleFormPicker onCancel={() => setGoogleFormPickerOpen(false)} />
                    </Dialog>
                </Stack>
                <Divider />
                <Stack css={toolbarStyle} direction="row" alignItems="center">
                    <Autocomplete 
                        css={filterboxStyle}
                        options={filterOptions}
                        renderInput={(params) => 
                            <TextField 
                                aria-label="filter forms" 
                                placeholder="Search..." 
                                size="small" 
                                variant="outlined" 
                                disabled={loading} 
                                {...params} />}
                        getOptionKey={option => option.id}
                        disabled={loading}
                        clearOnBlur={false}
                        onInputChange={(_event, newInputValue) => setFilterValue(newInputValue)}
                        inputValue={filterValue}
                    />
                    <Button 
                        color="primary" 
                        onClick={() => setRefresh(prev => !prev)} 
                        disabled={loading}
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                    >
                        Refresh
                    </Button>   
                </Stack>
                <DataGrid 
                    columns={dataGridColumns} 
                    rows={buildRows}
                    onRowSelectionModelChange={(newSelection) => setSelectedSurvey(newSelection.ids?.values()?.next()?.value || null)}
                />
            </Box>
        </Box>
        </>
    )
}