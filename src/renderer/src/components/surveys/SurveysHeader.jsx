import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { CloudDownload, UploadFile } from "@mui/icons-material";
import DeleteSurveyDialog from "./DeleteSurveyDialog";
import EditSurveyDialog from "./EditSurveyDialog";
import { GoogleFormPicker } from "../google-forms/GoogleFormPicker";
import CreateSurveyDialog from "./CreateSurveyDialog";
import ExcelImportDialog from "./ExcelImportDialog";
import { Link } from "react-router";

export default function SurveysHeader(props) {
  const {
    theme,
    selectedSurvey,
    selectedSurveyObject,

    actionsMenuAnchorEl,
    actionsMenuOpened,
    onOpenActionsMenu,
    onCloseActionsMenu,

    importMenuAnchorEl,
    importMenuOpened,
    onOpenImportMenu,
    onCloseImportMenu,

    deleteSurveyDialogOpen,
    setDeleteSurveyDialogOpen,
    editSurveyDialogOpen,
    setEditSurveyDialogOpen,

    createSurveyDialogOpen,
    setCreateSurveyDialogOpen,
    newSurveyName,
    setNewSurveyName,
    newSurveyCreationLoading,
    newSurveyCreationError,
    handleCreateSurveySubmit,

    googleFormPickerOpen,
    setGoogleFormPickerOpen,
    onGoogleFormsPickedForImport,

    googleImportDialogOpen,
    googleImportEventName,
    setGoogleImportEventName,
    googleImportEventDesc,
    setGoogleImportEventDesc,
    googleImportFormName,
    setGoogleImportFormName,
    googleImportBusy,
    googleImportErr,
    onCloseGoogleImportDialog,
    onConfirmGoogleImport,

    excelFileInputRef,
    handleExcelFileChosen,
    excelImportOpen,
    closeExcelImportDialog,
    excelMeta,
    importFormName,
    setImportFormName,
    importEventName,
    setImportEventName,
    importEventDesc,
    setImportEventDesc,
    needsImportEvent,
    importBusy,
    importErr,
    canDoImport,
    handleExcelImportSubmit,

    onRefresh,
  } = props;

  return (
    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
      <Typography flex={1} variant="h5" fontWeight="bold" mb={3} color="#000000">
        Surveys
      </Typography>

      <Button
        onClick={onOpenActionsMenu}
        variant="contained"
        color={theme.palette.primary.accent}
        endIcon={<ArrowDropDownIcon />}
      >
        Survey Actions
      </Button>

      <Menu
        label="Actions"
        anchorEl={actionsMenuAnchorEl}
        open={actionsMenuOpened}
        onClose={onCloseActionsMenu}
      >
        <MenuItem disabled={!selectedSurvey} value="view-data" component={Link} to={"/surveys/data/" + selectedSurveyObject?.id}>
          View Data
        </MenuItem>
        <MenuItem
          disabled={!selectedSurvey || selectedSurveyObject?.provider !== "google_forms"}
          value="view-on-browser"
          onClick={() => {
            if (selectedSurveyObject?.baseLink) {
              window.api.openExternal(selectedSurveyObject.baseLink);
            } else if (selectedSurveyObject?.externalId) {
              const googleFormsBaseUrl = "https://docs.google.com/forms/d/";
              window.api.openExternal(googleFormsBaseUrl + selectedSurveyObject.externalId);
            } else {
              alert("No link available for this survey.");
            }
          }}
        >
          View on Browser
        </MenuItem>
        <MenuItem disabled={!selectedSurvey} value="edit" onClick={() => setEditSurveyDialogOpen(true)}>
          Edit Details
        </MenuItem>
        <MenuItem disabled={!selectedSurvey} value="delete" onClick={() => setDeleteSurveyDialogOpen(true)}>
          Delete
        </MenuItem>
      </Menu>

      <DeleteSurveyDialog
        open={deleteSurveyDialogOpen}
        handleClose={() => setDeleteSurveyDialogOpen(false)}
        survey={selectedSurveyObject}
        onDelete={onRefresh}
      />

      <EditSurveyDialog
        open={editSurveyDialogOpen}
        handleClose={() => setEditSurveyDialogOpen(false)}
        survey={selectedSurveyObject}
        onEdit={onRefresh}
      />

      <Button variant="contained" endIcon={<AddIcon />} onClick={() => setCreateSurveyDialogOpen(true)}>
        Create New Survey
      </Button>

      <CreateSurveyDialog
        open={createSurveyDialogOpen}
        onClose={() => setCreateSurveyDialogOpen(false)}
        newSurveyName={newSurveyName}
        setNewSurveyName={setNewSurveyName}
        loading={newSurveyCreationLoading}
        error={newSurveyCreationError}
        onSubmit={handleCreateSurveySubmit}
      />

      <Button
        onClick={onOpenImportMenu}
        variant="contained"
        color="accent"
        endIcon={<ArrowDropDownIcon />}
      >
        Import Surveys
      </Button>

      <Menu
        label="Actions"
        anchorEl={importMenuAnchorEl}
        open={importMenuOpened}
        onClose={onCloseImportMenu}
      >
        <MenuItem value="from-google-drive" onClick={() => setGoogleFormPickerOpen(true)}>
          <ListItemIcon>
            <CloudDownload />
          </ListItemIcon>
          <ListItemText>From Google Drive</ListItemText>
        </MenuItem>

        <MenuItem
          value="upload-file"
          onClick={() => {
            onCloseImportMenu();
            excelFileInputRef.current?.click();
          }}
        >
          <ListItemIcon>
            <UploadFile />
          </ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
      </Menu>

      <input
        ref={excelFileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        style={{ display: "none" }}
        onChange={handleExcelFileChosen}
      />

      <ExcelImportDialog
        open={excelImportOpen}
        onClose={closeExcelImportDialog}
        importBusy={importBusy}
        excelMeta={excelMeta}
        importFormName={importFormName}
        setImportFormName={setImportFormName}
        importEventName={importEventName}
        setImportEventName={setImportEventName}
        importEventDesc={importEventDesc}
        setImportEventDesc={setImportEventDesc}
        needsImportEvent={needsImportEvent}
        importErr={importErr}
        canDoImport={canDoImport}
        onSubmit={handleExcelImportSubmit}
      />

      <Dialog open={googleFormPickerOpen} onClose={() => setGoogleFormPickerOpen(false)} fullWidth maxWidth="lg">
        <GoogleFormPicker
          onCancel={() => setGoogleFormPickerOpen(false)}
          onSubmit={(ids) => {
            onGoogleFormsPickedForImport?.(ids);
          }}
        />
      </Dialog>

      <Dialog open={googleImportDialogOpen} onClose={onCloseGoogleImportDialog} fullWidth maxWidth="sm">
        <DialogTitle>Import Google Forms</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose an event for the imported forms. A new event is created if the name does not exist yet.
          </Typography>
          <TextField
            margin="dense"
            label="Survey name (optional)"
            fullWidth
            value={googleImportFormName}
            onChange={(e) => setGoogleImportFormName(e.target.value)}
            disabled={googleImportBusy}
          />
          <TextField
            margin="dense"
            label="Event name"
            fullWidth
            required
            value={googleImportEventName}
            onChange={(e) => setGoogleImportEventName(e.target.value)}
            disabled={googleImportBusy}
          />
          <TextField
            margin="dense"
            label="Event description (optional)"
            fullWidth
            value={googleImportEventDesc}
            onChange={(e) => setGoogleImportEventDesc(e.target.value)}
            disabled={googleImportBusy}
          />
          {googleImportErr ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {googleImportErr}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseGoogleImportDialog} disabled={googleImportBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onConfirmGoogleImport}
            disabled={googleImportBusy || !googleImportEventName.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}