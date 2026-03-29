import { Alert, Box, Paper, Stack, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { css } from "@emotion/react";

const searchInputCss = css`
    width: 100%;
`;

const responsesList = css`
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
`;

const responseItemCss = css`
    padding: 0.75rem;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;

    &:hover {
        background-color: #fafafa;
    }

    &:last-child {
        border-bottom: none;
    }
`;

const countBadgeCss = css`
    background-color: #e8f5e9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
    font-size: 0.75rem;
`;

export default function TextResponsesSection({ question, searchValue, onSearchChange }) {
    return (
        <>
            <TextField
                fullWidth
                size="small"
                placeholder="Search responses..."
                variant="outlined"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                slotProps={{
                    input: {
                        startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                    }
                }}
                css={searchInputCss}
            />

            {question.textResponseList.length > 0 ? (
                <Box css={responsesList}>
                    <Stack spacing={0}>
                        {question.textResponseList
                            .filter((item) => {
                                const searchTerm = searchValue.toLowerCase();
                                return searchTerm === "" || item.text.toLowerCase().includes(searchTerm);
                            })
                            .map((item, idx) => (
                                <Paper key={idx} elevation={0} css={responseItemCss}>
                                    <Typography variant="body2">
                                        {item.text}
                                    </Typography>
                                    <Typography variant="caption" css={countBadgeCss}>
                                        {item.count} ({item.percentage}%)
                                    </Typography>
                                </Paper>
                            ))}
                    </Stack>
                </Box>
            ) : (
                <Alert severity="info">No text answers available for this question.</Alert>
            )}
        </>
    );
}
