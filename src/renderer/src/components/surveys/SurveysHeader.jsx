import {
  Alert,
  Button,
  Dialog,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { CloudDownload, UploadFile } from "@mui/icons-material";
import { useState } from "react";
import { GoogleFormPicker } from "../google-forms/GoogleFormPicker";
import DeleteSurveyDialog from "./DeleteSurveyDialog";
import EditSurveyDialog from "./EditSurveyDialog";
import CreateSurveyDialog from "./CreateSurveyDialog";
import { Link, useNavigate } from "react-router";
import GetUserSpecificLinkDialog from "./GetUserSpecificLinkDialog";

export default function SurveysHeader(props) {
  const { selectedSurveyObject, onRefresh } = props;
  const theme = useTheme();
  const navigate = useNavigate();

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
  const [headerError, setHeaderError] = useState('');

  const actionsMenuOpened = Boolean(actionsMenuAnchorEl);
  const importMenuOpened = Boolean(importMenuAnchorEl);

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

  function handleGoogleFormsPickedForImport(selectedFormIds, selectedForms = []) {
    if (!selectedFormIds?.length) return;

    setGoogleFormPickerOpen(false);
    navigate("/surveys/import/google-forms", {
      state: {
        selectedFormIds,
        selectedForms,
      },
    });
  }

  return (
    <Stack spacing={1} mb={1}>
      {headerError ? (
        <Alert severity="warning" onClose={() => setHeaderError('')}>
          {headerError}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={2} alignItems="center">
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
              window.api.googleForms.openInBrowserById(selectedSurveyObject.externalId);
            } else if (selectedSurveyObject?.baseLink) {
              window.api.googleForms.openInBrowserByBaseLink(selectedSurveyObject.baseLink);
            } else {
              setHeaderError('No link available for this survey.');
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
        <MenuItem
          value="from-google-drive"
          onClick={() => {
            setImportMenuAnchorEl(null);
            setGoogleFormPickerOpen(true);
          }}
        >
          <ListItemIcon>
            <CloudDownload />
          </ListItemIcon>
          <ListItemText>From Google Drive</ListItemText>
        </MenuItem>

        <MenuItem
          value="upload-file"
          component={Link}
          to="import/excel"
          onClick={() => setImportMenuAnchorEl(null)}
        >
          <ListItemIcon>
            <UploadFile />
          </ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={googleFormPickerOpen} onClose={() => setGoogleFormPickerOpen(false)} fullWidth maxWidth="lg">
        <GoogleFormPicker
          onCancel={() => setGoogleFormPickerOpen(false)}
          onSubmit={handleGoogleFormsPickedForImport}
          alternateTitle="Select Google Forms To Import"
          alternateSubtitle="Import Selected"
        />
      </Dialog>
      </Stack>
    </Stack>
  );
}