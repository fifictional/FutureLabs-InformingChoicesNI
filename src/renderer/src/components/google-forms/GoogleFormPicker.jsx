import { Autocomplete, Button, Card, CardActionArea, CardHeader, CardMedia, Container, css, Divider, Grid, IconButton, Menu, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';

export function GoogleFormPicker({ onSubmit, onCancel, alternateTitle, alternateSubtitle }) {
    const theme = useTheme();
    
    // region Form Picker State 
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFormIds, setSelectedFormIds] = useState([]);
    const [refresh, setRefresh] = useState(false);
    const [filterValue, setFilterValue] = useState('');
    const [sortBy, setSortBy] = useState('modifiedTimeDesc');

    const filterOptions = useMemo(() => {
        return forms.map(form => ({
            id: form.id,
            label: form.name || "Untitled Form"
        }));
    }, [forms]);
    // endregion

    // region Element Specific State
    const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
    const displayedForms = useMemo(() => {
        const lowerFilter = filterValue.trim().toLowerCase();

        const filtered = lowerFilter
            ? forms.filter(form =>
                (form.name || "").toLowerCase().includes(lowerFilter)
            )
            : forms;

        const sorted = [...filtered];

        switch (sortBy) {
            case 'nameAsc':
                sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                break;
            case 'nameDesc':
                sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
                break;
            case 'modifiedTimeAsc':
                sorted.sort((a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime());
                break;
            case 'modifiedTimeDesc':
                sorted.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
                break;
            default:
                break;
        }

        return sorted;
    }, [forms, filterValue, sortBy]);
    // endregion

    // region Styles
    const containerStyle = css`        
        display: flex;
        flex-direction: column;
        padding: 1em;
        box-sizing: border-box;
    `;

    const topBarStyle = css`
        padding: 0.5em 0;
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

    const cardStyle = css`
        cursor: pointer;
        box-sizing: border-box;
        width: 300px;

        @media (max-width: 600px) {
            width: 100%;
        }

        & .MuiCardActionArea-root[data-selected="true"] {
            outline: 2px solid ${theme.palette.primary.main};
            outline-offset: -2px;
        }

        
        & .MuiTypography-root {
            width: 220px;
        }
    `;
    // endregion

    // region Effects
    useEffect(() => {
        async function fetchForms() {
            setLoading(true); 
            setError(null);
            try {
                const response = await window.api.googleForms.list();
                const alreadyImportedForms = await window.api.forms.list();

                if (!response || !response.files) {
                    throw new Error('Invalid response from Google Drive API');
                }

                // Filter out forms that have already been imported based on their IDs
                const filteredForms = response.files.filter(form => {
                    return !alreadyImportedForms.some(importedForm => importedForm.externalId === form.id);
                });

                setForms(filteredForms);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        fetchForms();
    }, [refresh]);

    // endregion

    // region Handlers
    const handleSortSelect = (criteria) => {
        setSortBy(criteria);
        setSortMenuAnchorEl(null);
    }

    const toggleSelectCard = (formId) => {
        if (selectedFormIds.includes(formId)) {
            setSelectedFormIds(prev => prev.filter(id => id !== formId));
        } else {
            setSelectedFormIds(prev => [...prev, formId]);
        }
    }
    // endregion

    return (
        <Container css={containerStyle}>
            <Stack>
                <Stack css={topBarStyle} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{alternateTitle ?? "Select Google Forms"}</Typography>
                    <IconButton onClick={() => onCancel()} disabled={loading}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
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
                    <span css={css`margin-left: auto;`}>
                        <IconButton 
                            aria-controls="google-forms-picker-sort-menu"
                            aria-haspopup="true"
                            aria-expanded={Boolean(sortMenuAnchorEl)}
                            color="primary" 
                            disabled={loading} 
                            onClick={(e) => setSortMenuAnchorEl(e.currentTarget)}
                        >
                            <SortIcon />
                        </IconButton>
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
                    </span>
                    <IconButton color="primary" onClick={() => setRefresh(prev => !prev)} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                    <Button css={css`margin-left: 0.5em;`} variant="contained" color="primary" onClick={() => onSubmit(selectedFormIds)} disabled={selectedFormIds.length === 0 || loading}>
                        {alternateSubtitle || "Import Selected"}
                    </Button>
                </Stack>
                <Divider />
                <Grid padding="1em 0" container spacing={3} justifyContent={"space-between"}>
                    {loading && <Typography>Loading...</Typography>}
                    {error && <Typography color="error">Error: {error}</Typography>}
                    {!loading && !error && displayedForms.length === 0 && <Typography>No forms found.</Typography>}
                    {!loading && !error && displayedForms.map(form => (
                        <Card elevation={1} key={form.id} css={cardStyle}>
                            <CardActionArea data-selected={selectedFormIds.includes(form.id)} onClick={() => toggleSelectCard(form.id)}>
                                <CardHeader slotProps={{title: { noWrap: true }, subheader: { noWrap: true }}} avatar={<img src={form.iconLink}/>} title={form.name || "Untitled Form"} subheader={`Modified: ${new Date(form.modifiedTime).toDateString() || "N/A"}`} />
                                <CardMedia component="img" image={form.thumbnailBase64} alt={`${form.name} thumbnail`} />
                            </CardActionArea>
                        </Card>
                    ))}
                </Grid>
            </Stack>
        </Container>
    )
}   