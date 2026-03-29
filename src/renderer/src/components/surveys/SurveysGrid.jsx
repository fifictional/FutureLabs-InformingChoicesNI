import { IconButton } from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";
import { DataGrid } from "@mui/x-data-grid";

const columns = [
  { field: "name", headerName: "Name", flex: 1 },
  { field: "event", headerName: "Event", width: 300 },
  { field: "source", headerName: "Source", width: 150 },
  { field: "ResponseCount", headerName: "Responses", width: 120 },
  {
    field: "webViewLink",
    headerName: "Link",
    width: 100,
    renderCell: (params) => (
      <>
      {params.row.source === "Google Forms" && params.value ? (
        <IconButton color="primary" onClick={() => {window.api.googleForms.openInBrowserByBaseLink(params.value);}}>
          <LaunchIcon />
        </IconButton>
      ) : (<></>)}
      </>
    ),
  },
];

export default function SurveysGrid({ rows, onSelect, loading }) {
  return (
    <DataGrid
      columns={columns}
      loading={loading}
      slotProps={{
        loadingOverlay: {
          variant: 'linear-progress',
          noRowsVariant: 'skeleton',
        },
      }}
      rows={rows}
      onRowSelectionModelChange={(newSelection) =>
        onSelect(newSelection.ids?.values()?.next()?.value || null)
      }
    />
  );
}