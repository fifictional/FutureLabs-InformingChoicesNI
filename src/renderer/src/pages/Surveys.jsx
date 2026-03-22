import { Autocomplete, Box, Button, css, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useTheme } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useEffect, useMemo, useState } from "react";
import { GoogleFormPicker } from "../components/google-forms/GoogleFormPicker";
import SortIcon from '@mui/icons-material/Sort';
import LaunchIcon from '@mui/icons-material/Launch';
import { CloudDownload, UploadFile } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";

export default function Surveys() {
    const theme = useTheme();

    // data    
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);

    // actions menu
    const [actionsMenuOpened, setActionsMenuOpened] = useState(false);
    const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);

    // sort and filter 
    const [filterValue, setFilterValue] = useState('');
    const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);

    // import menu
    const [googleFormPickerOpen, setGoogleFormPickerOpen] = useState(false);
    const [importMenuOpened, setImportMenuOpened] = useState(false);
    const [importMenuAnchorEl, setImportMenuAnchorEl] = useState(null);

    // create new survey
    const [createSurveyDialogOpen, setCreateSurveyDialogOpen] = useState(false);
    const [newSurveyTitle, setNewSurveyTitle] = useState('');

    const handleActionsClick = (event) => {
        setActionsMenuAnchorEl(event.currentTarget);
        setActionsMenuOpened(true);
    };

    const handleImportClick = (event) => {
        setImportMenuAnchorEl(event.currentTarget);
        setImportMenuOpened(true);
    }

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
        { field: 'Event', headerName: 'Event', width: 300 },
        { field: "source", headerName: "Source", width: 150 },
        { field: 'modifiedTime', headerName: 'Modified Time', width: 180 },
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

    const dataGridExampleRow = [
        { id: 1, name: 'Customer Satisfaction Survey', Event: 'Customer Feedback', source: "Google Forms", modifiedTime: '2024-06-01', ResponseCount: 120, webViewLink: 'https://docs.google.com/forms/d/1abc123/viewform' },
    ]

    useEffect(() => {
        console.log("Selected survey changed:", selectedSurvey);
    }, [selectedSurvey]);

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
                            <TextField onChange={(e) => setNewSurveyTitle(e.target.value)}  fullWidth label="Survey Title" variant="outlined" margin="normal" />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setCreateSurveyDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={!newSurveyTitle} onClick={() => setCreateSurveyDialogOpen(false)} variant="contained" color="primary">
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
                        <MenuItem value="upload-file">
                            <ListItemIcon>
                                <UploadFile />
                            </ListItemIcon> 
                            <ListItemText>
                                Upload File 
                            </ListItemText>
                        </MenuItem>
                    </Menu>
                    <Dialog open={googleFormPickerOpen} onClose={() => setGoogleFormPickerOpen(false)} fullWidth maxWidth="md">
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
                        aria-controls="google-forms-picker-sort-menu"
                        aria-haspopup="true"
                        aria-expanded={Boolean(sortMenuAnchorEl)}
                        color="primary" 
                        variant="outlined"
                        disabled={loading} 
                        onClick={(e) => setSortMenuAnchorEl(e.currentTarget)}
                        startIcon={<SortIcon />}
                    >
                        Sort  
                    </Button>
                    <Menu
                        id="google-forms-picker-sort-menu"
                        anchorEl={sortMenuAnchorEl}
                        open={Boolean(sortMenuAnchorEl)}
                        onClose={() => setSortMenuAnchorEl(null)}
                    >
                        <MenuItem onClick={() => handleSortSelect("modifiedTimeDesc")}>modified time newest</MenuItem>
                        <MenuItem onClick={() => handleSortSelect("modifiedTimeAsc")}>modified time oldest</MenuItem>
                        <MenuItem onClick={() => handleSortSelect("nameAsc")}>name A-Z</MenuItem>
                        <MenuItem onClick={() => handleSortSelect("nameDesc")}>name Z-A</MenuItem>
                    </Menu>
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
                    rows={dataGridExampleRow}
                    onRowSelectionModelChange={(newSelection) => setSelectedSurvey(newSelection.ids?.values()?.next()?.value || null)}
                />
            </Box>
        </Box>
        </>
    )
}