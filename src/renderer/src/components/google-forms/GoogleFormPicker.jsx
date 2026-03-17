import { Autocomplete, Box, Button, Card, CardActionArea, CardHeader, CardMedia, Container, css, Divider, IconButton, Menu, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SortIcon from '@mui/icons-material/Sort';

export function GoogleFormPicker({ onSubmit, onCancel, alternateTitle, alternateSubtitle, ...props }) {
    const theme = useTheme();
    
    // region Form Picker State 
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFormIds, setSelectedFormIds] = useState([]);
    const [refresh, setRefresh] = useState(false);
    const [filterOptions, setFilterOptions] = useState([]);
    const [filterValue, setFilterValue] = useState('');
    const [sortBy, setSortBy] = useState('modifiedTimeAsc');
    // endregion

    // region Element Specific State
    const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState(null);
    const [displayedForms, setDisplayedForms] = useState([]);
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
        width: 300px;
        @media (max-width: 600px) {
            width: 100%;
        }

        & .MuiCardActionArea-root[data-selected="true"] {
            border: 2px solid ${theme.palette.primary.main};
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
                if (!response || !response.files) {
                    throw new Error('Invalid response from Google Drive API');
                }

                setForms(response.files);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        fetchForms();
    }, [refresh]);

    useEffect(() => {
        if (forms.length > 0) {
            const options = forms.map(form => ({
                id: form.id,
                label: form.name
            }));
            setFilterOptions(options);
        }
    }, [forms]);

    useEffect(() => {
        let filtered = forms;
        if (filterValue) {
            const lowerFilter = filterValue.toLowerCase();
            filtered = forms.filter(form => form.name.toLowerCase().includes(lowerFilter));
        }
        setDisplayedForms(filtered);
        
    }, [filterValue, forms]);

    useEffect(() => {
        let sorted = [...displayedForms];
        switch (sortBy) {
            case 'nameAsc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'nameDesc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'modifiedTimeAsc':
                sorted.sort((a, b) => new Date(a.modifiedTime) - new Date(b.modifiedTime));
                break;
            case 'modifiedTimeDesc':
                sorted.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
                break;  
            default:
                break;
        }
        setDisplayedForms(sorted);
    }, [sortBy]);
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
                    <IconButton onClick={() => onCancel(true)} disabled={loading}>
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
                            <MenuItem onClick={() => handleSortSelect("modifiedTimeAsc")}>modified time newest</MenuItem>
                            <MenuItem onClick={() => handleSortSelect("modifiedTimeDesc")}>modified time oldest</MenuItem>
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
                <Stack padding="1em 0" flexWrap="wrap" spacing={3} direction="row" justifyContent="flex-start" alignItems="stretch">
                    {loading && <Typography>Loading...</Typography>}
                    {error && <Typography color="error">Error: {error}</Typography>}
                    {!loading && !error && displayedForms.length === 0 && <Typography>No forms found.</Typography>}
                    {!loading && !error && displayedForms.map(form => (
                        <Card elevation={1} key={form.id} css={cardStyle}>
                            <CardActionArea data-selected={selectedFormIds.includes(form.id)} onClick={() => toggleSelectCard(form.id)}>
                                <CardHeader avatar={<img src={form.iconLink}/>} title={form.name || "Untitled Form"} subheader={`Modified: ${new Date(form.modifiedTime).toDateString() || "N/A"}`} />
                                <CardMedia component="img" image={form.thumbnailBase64} alt={`${form.name} thumbnail`} />
                            </CardActionArea>
                        </Card>
                    ))}
                </Stack>
            </Stack>
        </Container>
    )
}   