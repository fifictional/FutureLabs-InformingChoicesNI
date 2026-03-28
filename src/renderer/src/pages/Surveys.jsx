import { Box, Divider, css, useTheme } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import SurveysHeader from "../components/surveys/SurveysHeader";
import SurveysToolbar from "../components/surveys/SurveysToolbar";
import SurveysGrid from "../components/surveys/SurveysGrid";
import { buildSurveyRows } from "../common/SurveyUtils";

export default function Surveys() {
  const theme = useTheme();

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const [actionsMenuOpened, setActionsMenuOpened] = useState(false);
  const [actionsMenuAnchorEl, setActionsMenuAnchorEl] = useState(null);

  const [filterValue, setFilterValue] = useState("");

  const [googleFormPickerOpen, setGoogleFormPickerOpen] = useState(false);
  const [importMenuOpened, setImportMenuOpened] = useState(false);
  const [importMenuAnchorEl, setImportMenuAnchorEl] = useState(null);

  const [createSurveyDialogOpen, setCreateSurveyDialogOpen] = useState(false);
  const [newSurveyName, setNewSurveyName] = useState("");
  const [newSurveyCreationLoading, setNewSurveyCreationLoading] = useState(false);
  const [newSurveyCreationError, setNewSurveyCreationError] = useState(null);

  const [deleteSurveyDialogOpen, setDeleteSurveyDialogOpen] = useState(false);
  const [editSurveyDialogOpen, setEditSurveyDialogOpen] = useState(false);

  const [googleImportDialogOpen, setGoogleImportDialogOpen] = useState(false);
  const [googleImportPendingIds, setGoogleImportPendingIds] = useState(null);
  const [googleImportEventName, setGoogleImportEventName] = useState("");
  const [googleImportEventDesc, setGoogleImportEventDesc] = useState("");
  const [googleImportFormName, setGoogleImportFormName] = useState("");
  const [googleImportBusy, setGoogleImportBusy] = useState(false);
  const [googleImportErr, setGoogleImportErr] = useState("");

  const excelFileInputRef = useRef(null);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelBuffer, setExcelBuffer] = useState(null);
  const [excelMeta, setExcelMeta] = useState(null);
  const [importFormName, setImportFormName] = useState("");
  const [importEventName, setImportEventName] = useState("");
  const [importEventDesc, setImportEventDesc] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");

  const selectedSurveyObject = useMemo(() => {
    if (!selectedSurvey) return null;
    return forms.find((survey) => survey.id === selectedSurvey) || null;
  }, [selectedSurvey, forms]);

  useEffect(() => {
    if (excelImportOpen && excelMeta) {
      setImportFormName(excelMeta.suggestedFormName || "");
      setImportEventName(excelMeta.suggestedEventName || "");
      setImportEventDesc("");
      setImportErr("");
    }
  }, [excelImportOpen, excelMeta]);

  useEffect(() => {
    async function fetchForms() {
      setLoading(true);
      try {
        const formList = await window.api.forms.listWithEventNameAndResponseCount();
        setForms(formList);
      } catch (err) {
        console.error("Failed to fetch forms", err);
        window.alert("Failed to fetch forms. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, [refresh]);

  const rows = useMemo(() => buildSurveyRows(forms), [forms]);

  const filterOptions = useMemo(
    () =>
      forms.map((form) => ({
        id: form.id,
        label: form.name || "Untitled Form",
      })),
    [forms]
  );

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

  async function handleExcelImportSubmit() {
    setImportBusy(true);
    setImportErr("");

    const res = await window.api.surveys.commitExcelImport({
      buffer: excelBuffer,
      formName: importFormName.trim(),
      eventName: importEventName.trim(),
      eventDescription: importEventDesc.trim() || undefined,
    });

    setImportBusy(false);

    if (!res.ok) {
      setImportErr(res.error || "Import failed");
      return;
    }

    window.alert("Import finished.");
    closeExcelImportDialog();
    triggerRefresh();
  }

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
      window.api.googleForms.openInBrowser(newForm.formId);
      triggerRefresh();
    } catch {
      setNewSurveyCreationError("Failed to create survey. Please try again.");
    } finally {
      setNewSurveyCreationLoading(false);
    }
  }

  function triggerRefresh() {
    setRefresh((prev) => !prev);
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
      triggerRefresh();
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

  const needsImportEvent = !excelMeta?.hasPerRowEvent;
  const canDoImport =
    importFormName.trim() !== "" &&
    (!needsImportEvent || importEventName.trim() !== "") &&
    !importBusy &&
    excelBuffer;

  const backgroundStyle = css`
    background-color: #f5f5f5;
    width: 100%;
    height: 100%;
  `;

  const containerStyle = css`
    margin: 0 auto;
    padding: 2rem;
  `;

  return (
    <Box css={backgroundStyle}>
      <Box css={containerStyle}>
        <SurveysHeader
          theme={theme}
          selectedSurvey={selectedSurvey}
          selectedSurveyObject={selectedSurveyObject}
          actionsMenuAnchorEl={actionsMenuAnchorEl}
          actionsMenuOpened={actionsMenuOpened}
          onOpenActionsMenu={(event) => {
            setActionsMenuAnchorEl(event.currentTarget);
            setActionsMenuOpened(true);
          }}
          onCloseActionsMenu={() => setActionsMenuOpened(false)}
          importMenuAnchorEl={importMenuAnchorEl}
          importMenuOpened={importMenuOpened}
          onOpenImportMenu={(event) => {
            setImportMenuAnchorEl(event.currentTarget);
            setImportMenuOpened(true);
          }}
          onCloseImportMenu={() => setImportMenuOpened(false)}
          deleteSurveyDialogOpen={deleteSurveyDialogOpen}
          setDeleteSurveyDialogOpen={setDeleteSurveyDialogOpen}
          editSurveyDialogOpen={editSurveyDialogOpen}
          setEditSurveyDialogOpen={setEditSurveyDialogOpen}
          createSurveyDialogOpen={createSurveyDialogOpen}
          setCreateSurveyDialogOpen={setCreateSurveyDialogOpen}
          newSurveyName={newSurveyName}
          setNewSurveyName={setNewSurveyName}
          newSurveyCreationLoading={newSurveyCreationLoading}
          newSurveyCreationError={newSurveyCreationError}
          handleCreateSurveySubmit={handleCreateSurveySubmit}
          googleFormPickerOpen={googleFormPickerOpen}
          setGoogleFormPickerOpen={setGoogleFormPickerOpen}
          onGoogleFormsPickedForImport={handleGoogleFormsPickedForImport}
          googleImportDialogOpen={googleImportDialogOpen}
          googleImportEventName={googleImportEventName}
          setGoogleImportEventName={setGoogleImportEventName}
          googleImportEventDesc={googleImportEventDesc}
          setGoogleImportEventDesc={setGoogleImportEventDesc}
          googleImportFormName={googleImportFormName}
          setGoogleImportFormName={setGoogleImportFormName}
          googleImportBusy={googleImportBusy}
          googleImportErr={googleImportErr}
          onCloseGoogleImportDialog={closeGoogleImportDialog}
          onConfirmGoogleImport={confirmGoogleImport}
          excelFileInputRef={excelFileInputRef}
          handleExcelFileChosen={handleExcelFileChosen}
          excelImportOpen={excelImportOpen}
          closeExcelImportDialog={closeExcelImportDialog}
          excelMeta={excelMeta}
          importFormName={importFormName}
          setImportFormName={setImportFormName}
          importEventName={importEventName}
          setImportEventName={setImportEventName}
          importEventDesc={importEventDesc}
          setImportEventDesc={setImportEventDesc}
          needsImportEvent={needsImportEvent}
          importBusy={importBusy}
          importErr={importErr}
          canDoImport={canDoImport}
          handleExcelImportSubmit={handleExcelImportSubmit}
          onRefresh={triggerRefresh}
        />

        <Divider />

        <SurveysToolbar
          loading={loading}
          filterOptions={filterOptions}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          onRefresh={triggerRefresh}
        />

        <SurveysGrid rows={rows} onSelect={setSelectedSurvey} />
      </Box>
    </Box>
  );
}