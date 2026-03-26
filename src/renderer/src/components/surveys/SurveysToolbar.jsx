import { Autocomplete, Button, Stack, TextField } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { css } from "@mui/material/styles";

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

export default function SurveysToolbar({
  loading,
  filterOptions,
  filterValue,
  setFilterValue,
  onRefresh,
}) {
  return (
    <Stack css={toolbarStyle} direction="row" alignItems="center">
      <Autocomplete
        css={filterboxStyle}
        options={filterOptions}
        renderInput={(params) => (
          <TextField
            aria-label="filter forms"
            placeholder="Search..."
            size="small"
            variant="outlined"
            disabled={loading}
            {...params}
          />
        )}
        getOptionKey={(option) => option.id}
        disabled={loading}
        clearOnBlur={false}
        onInputChange={(_event, newInputValue) => setFilterValue(newInputValue)}
        inputValue={filterValue}
      />
      <Button
        color="primary"
        onClick={onRefresh}
        disabled={loading}
        variant="outlined"
        startIcon={<RefreshIcon />}
      >
        Refresh
      </Button>
    </Stack>
  );
}