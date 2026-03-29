import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { CloudDownload, UploadFile } from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import DeleteSurveyDialog from "./DeleteSurveyDialog";
import EditSurveyDialog from "./EditSurveyDialog";
import { GoogleFormPicker } from "../google-forms/GoogleFormPicker";
import CreateSurveyDialog from "./CreateSurveyDialog";
import ExcelImportDialog from "./ExcelImportDialog";
import { Link } from "react-router";
import GetUserSpecificLinkDialog from "./GetUserSpecificLinkDialog";

export default function SurveysHeader(props) {
  const { selectedSurveyObject, onRefresh } = props;
  const theme = useTheme();

  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);
  const [importMenuAnchorEl, setImportMenuAnchorEl] = useState(null);
  const [deleteSurveyDialogOpen, setDeleteSurveyDialogOpen] = useState(false);
  const [editSurveyDialogOpen, setEditSurveyDialogOpen] = useState(false);
  const [getUserSpecificLinkDialogOpen, setGetUserSpecificLinkDialogOpen] = useState(false);

  const [createSurveyDialogOpen, setCreateSurveyDialogOpen] = useState(false);
  const [newSurveyName, setNewSurveyName] = useState("");
  const [newSurveyCreationLoading, setNewSurveyCreationLoading] = useState(false);
  const [newSurveyCreationError, setNewSurveyCreationError] = useState(null);

  const [googleFormPickerOpen, setGoogleFormPickerOpen] = useState(false);
  const excelFileInputRef = useRef(null);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelBuffer, setExcelBuffer] = useState(null);
  const [excelMeta, setExcelMeta] = useState(null);
  const [importFormName, setImportFormName] = useState("");
  const [importEventName, setImportEventName] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [googleImportDialogOpen, setGoogleImportDialogOpen] = useState(false);
  const [googleImportPendingIds, setGoogleImportPendingIds] = useState(null);
  const [googleImportEventName, setGoogleImportEventName] = useState("");
  const [googleImportEventDesc, setGoogleImportEventDesc] = useState("");
  const [googleImportFormName, setGoogleImportFormName] = useState("");
  const [googleImportBusy, setGoogleImportBusy] = useState(false);
  const [googleImportErr, setGoogleImportErr] = useState("");

  const actionsMenuOpened = Boolean(actionsMenuAnchorEl);
  const importMenuOpened = Boolean(importMenuAnchorEl);

  const needsImportEvent = !excelMeta?.hasPerRowEvent;
  const canDoImport =
    importFormName.trim() !== "" &&
    (!needsImportEvent || importEventName.trim() !== "") &&
    !importBusy &&
    excelBuffer;

  useEffect(() => {
    if (excelImportOpen && excelMeta) {
      setImportFormName(excelMeta.suggestedFormName || "");
      setImportEventName(excelMeta.suggestedEventName || "");
      setImportErr("");
    }
  }, [excelImportOpen, excelMeta]);

  async function handleCreateSurveySubmit() {
    if (!newSurveyName.trim()) return;

    setNewSurveyCreationLoading(true);
    setNewSurveyCreationError(null);

    try {
      const newForm = await window.api.googleForms.create(
        newSurveyName.trim(),
        newSurveyName.trim()
      );
      setCreateSurveyDialogOpen(false);
      setNewSurveyName("");
      window.api.googleForms.openInBrowserById(newForm.formId);
      onRefresh();
    } catch {
      setNewSurveyCreationError("Failed to create survey. Please try again.");
    } finally {
      setNewSurveyCreationLoading(false);
    }
  }

  async function handleExcelFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const res = await window.api.surveys.parseExcelImport(buf);

      if (!res.ok) {
        window.alert(res.error || "Could not read Excel file");
        return;
      }

      setExcelBuffer(buf);
      setExcelMeta(res);
      setExcelImportOpen(true);
    } catch (err) {
      window.alert(err?.message || String(err));
    }
  }

  function closeExcelImportDialog() {
    if (importBusy) return;
    setExcelImportOpen(false);
    setExcelBuffer(null);
    setExcelMeta(null);
  }

  async function handleExcelImportSubmit() {
    setImportBusy(true);
    setImportErr("");

    const res = await window.api.surveys.commitExcelImport({
      buffer: excelBuffer,
      formName: importFormName.trim(),
      eventName: importEventName.trim(),
    });

    setImportBusy(false);

    if (!res.ok) {
      setImportErr(res.error || "Import failed");
      return;
    }

    closeExcelImportDialog();
    onRefresh();
  }

  function handleGoogleFormsPickedForImport(selectedFormIds) {
    if (!selectedFormIds?.length) return;
    setGoogleImportPendingIds(selectedFormIds);
    setGoogleImportEventName("");
    setGoogleImportEventDesc("");
    setGoogleImportFormName("");
    setGoogleImportErr("");
    setGoogleFormPickerOpen(false);
    setGoogleImportDialogOpen(true);
  }

  function closeGoogleImportDialog() {
    if (googleImportBusy) return;
    setGoogleImportDialogOpen(false);
    setGoogleImportPendingIds(null);
    setGoogleImportErr("");
  }

  async function confirmGoogleImport() {
    if (!googleImportPendingIds?.length) return;
    if (!googleImportEventName.trim()) {
      setGoogleImportErr("Event name is required.");
      return;
    }
    setGoogleImportBusy(true);
    setGoogleImportErr("");
    try {
      const res = await window.api.googleForms.importSelected({
        formIds: googleImportPendingIds,
        eventName: googleImportEventName.trim(),
        eventDescription: googleImportEventDesc.trim() || undefined,
        formNameOverride: googleImportFormName.trim() || undefined,
      });
      if (!res?.ok) {
        setGoogleImportErr(res?.error || "Import failed");
        return;
      }
      closeGoogleImportDialog();
      onRefresh();
    } catch (e) {
      setGoogleImportErr(e?.message || String(e));
    } finally {
      setGoogleImportBusy(false);
    }
  }

  function closeExcelImportDialog() {
    if (importBusy) return;
    setExcelImportOpen(false);
    setExcelBuffer(null);
    setExcelMeta(null);
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
      <Typography flex={1} variant="h5" fontWeight="bold" mb={3} color="#000000">
        Surveys
      </Typography>

      <Button
        onClick={(event) => setActionsMenuAnchorEl(event.currentTarget)}
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
        onClose={() => setActionsMenuAnchorEl(null)}
      >
        <MenuItem disabled={!selectedSurveyObject} value="view-data" component={Link} to={"/surveys/data/" + selectedSurveyObject?.id}>
          View Data
        </MenuItem>
        <MenuItem
          disabled={!selectedSurveyObject || selectedSurveyObject?.provider !== "google_forms"}
          value="view-on-browser"
          onClick={() => {
            if (selectedSurveyObject?.externalId) {
              const googleFormsBaseUrl = "https://docs.google.com/forms/d/";
              window.api.googleForms.openInBrowserById(selectedSurveyObject.externalId);
            } else if (selectedSurveyObject?.baseLink) {
              window.api.googleForms.openInBrowserByBaseLink(selectedSurveyObject.baseLink);
            } else {
              alert("No link available for this survey.");
            }
          }}
        >
          View on Browser
        </MenuItem>
        <MenuItem
          disabled={!selectedSurveyObject || selectedSurveyObject?.provider !== "google_forms"}
          value="get-user-link"
          onClick={() => setGetUserSpecificLinkDialogOpen(true)}
        >
          Get User Specific Link
        </MenuItem>
        <MenuItem disabled={!selectedSurveyObject} value="edit" onClick={() => setEditSurveyDialogOpen(true)}>
          Edit Details
        </MenuItem>
        <MenuItem disabled={!selectedSurveyObject} value="delete" onClick={() => setDeleteSurveyDialogOpen(true)}>
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

      <GetUserSpecificLinkDialog
        open={getUserSpecificLinkDialogOpen}
        onClose={() => setGetUserSpecificLinkDialogOpen(false)}
        survey={selectedSurveyObject}
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
        onClick={(event) => setImportMenuAnchorEl(event.currentTarget)}
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
        onClose={() => setImportMenuAnchorEl(null)}
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
            setImportMenuAnchorEl(null);
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
        needsImportEvent={needsImportEvent}
        importErr={importErr}
        canDoImport={canDoImport}
        onSubmit={handleExcelImportSubmit}
      />

      <Dialog open={googleFormPickerOpen} onClose={() => setGoogleFormPickerOpen(false)} fullWidth maxWidth="lg">
        <GoogleFormPicker
          onCancel={() => setGoogleFormPickerOpen(false)}
          onSubmit={(ids) => {
            handleGoogleFormsPickedForImport(ids);
          }}
        />
      </Dialog>

      <Dialog open={googleImportDialogOpen} onClose={closeGoogleImportDialog} fullWidth maxWidth="sm">
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
          <Button onClick={closeGoogleImportDialog} disabled={googleImportBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmGoogleImport}
            disabled={googleImportBusy || !googleImportEventName.trim()}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}