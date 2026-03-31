import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import ContainerWithBackground from "../components/common/ContainerWithBackground";
import EventSelectorAutocomplete from "../components/events/EventSelectorAutocomplete.jsx";
import CreateEventDialog from "../components/events/CreateEventDialog.jsx";

export default function ExcelImportPage() {
  const navigate = useNavigate();
  const excelFileInputRef = useRef(null);

  const [selectedFileName, setSelectedFileName] = useState("");
  const [excelBuffer, setExcelBuffer] = useState(null);
  const [excelMeta, setExcelMeta] = useState(null);

  const [importFormName, setImportFormName] = useState("");
  const [importEventName, setImportEventName] = useState("");
  const [importReferenceQuestionIndex, setImportReferenceQuestionIndex] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importErr, setImportErr] = useState("");

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [pendingNewEventName, setPendingNewEventName] = useState("");
  const [eventSelectorReloadToken, setEventSelectorReloadToken] = useState(0);

  const needsImportEvent = !excelMeta?.hasPerRowEvent;
  const previewColumns = useMemo(() => {
    if (!Array.isArray(excelMeta?.previewColumns)) return [];
    return excelMeta.previewColumns.map((col) => ({
      field: col.field,
      headerName: col.headerName,
      minWidth: 150,
      flex: 1,
    }));
  }, [excelMeta]);

  const previewRows = useMemo(() => {
    if (!Array.isArray(excelMeta?.previewRows)) return [];
    return excelMeta.previewRows;
  }, [excelMeta]);

  const questionDefinitionColumns = useMemo(
    () => [
      { field: "question", headerName: "Question", minWidth: 220, flex: 1.2 },
      { field: "answerType", headerName: "Type", minWidth: 120, flex: 0.5 },
      { field: "choiceCount", headerName: "Choices", minWidth: 100, flex: 0.4 },
      { field: "choices", headerName: "Choice Values", minWidth: 260, flex: 1.3 },
      { field: "source", headerName: "Source", minWidth: 120, flex: 0.5 },
    ],
    []
  );

  const questionDefinitionRows = useMemo(() => {
    if (!Array.isArray(excelMeta?.questionDefinitions)) return [];
    return excelMeta.questionDefinitions;
  }, [excelMeta]);

  const referenceQuestionOptions = useMemo(() => {
    return questionDefinitionRows
      .filter((row) => row.answerType === "text")
      .map((row, idx) => ({
        value:
          typeof row.questionIndex === "number"
            ? row.questionIndex
            : typeof row.id === "number"
              ? row.id - 1
              : idx,
        label: row.question,
      }));
  }, [questionDefinitionRows]);

  const canDoImport = useMemo(() => {
    return (
      importFormName.trim() !== "" &&
      (!needsImportEvent || importEventName.trim() !== "") &&
      !importBusy &&
      !!excelBuffer
    );
  }, [
    excelBuffer,
    importBusy,
    importEventName,
    importFormName,
    needsImportEvent,
  ]);

  useEffect(() => {
    if (!excelMeta) return;
    setImportFormName(excelMeta.suggestedFormName || "");
    setImportEventName(excelMeta.suggestedEventName || "");
    setImportReferenceQuestionIndex(
      typeof referenceQuestionOptions[0]?.value === "number" ? referenceQuestionOptions[0].value : ""
    );
    setImportErr("");
  }, [excelMeta, referenceQuestionOptions]);

  async function handleExcelFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const res = await window.api.surveys.parseExcelImport(buf);

      if (!res.ok) {
        setImportErr(res.error || "Could not read Excel file");
        return;
      }

      setSelectedFileName(file.name || "");
      setExcelBuffer(buf);
      setExcelMeta(res);
    } catch (err) {
      setImportErr(err?.message || String(err));
    }
  }

  async function handleExcelImportSubmit() {
    if (!canDoImport) return;

    setImportBusy(true);
    setImportErr("");

    try {
      const res = await window.api.surveys.commitExcelImport({
        buffer: excelBuffer,
        formName: importFormName.trim(),
        eventName: importEventName.trim(),
        userReferenceQuestionIndex: importReferenceQuestionIndex,
      });

      if (!res.ok) {
        setImportErr(res.error || "Import failed");
        return;
      }

      navigate("/surveys");
    } catch (err) {
      setImportErr(err?.message || String(err));
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <ContainerWithBackground>
      <Box sx={{ maxWidth: 1200, width: "100%", mx: "auto" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold" color="#000000">
            Import Survey From Excel
          </Typography>
          <Button component={Link} to="/surveys" disabled={importBusy}>
            Back to Surveys
          </Button>
        </Stack>

        <Typography variant="body2">
          First row must be column titles (your questions). Each following row is one response.
          Optional columns: "Form Name", "Event Name" (or "Event"), "Timestamp".
        </Typography>

        <Divider />

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            onClick={() => excelFileInputRef.current?.click()}
            disabled={importBusy}
          >
            Choose Excel File
          </Button>
          <Typography variant="body2">
            {selectedFileName || "No file selected"}
          </Typography>
        </Stack>

        <input
          ref={excelFileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style={{ display: "none" }}
          onChange={handleExcelFileChosen}
        />

        {excelMeta ? (
          <Typography variant="caption" display="block">
            {excelMeta.questionHeaders?.length || 0} questions, {excelMeta.rowCount} rows
            {excelMeta.hasPerRowEvent ? " (event per row from sheet or default below)" : ""}
          </Typography>
        ) : null}

        <TextField
          label="Survey Name"
          fullWidth
          value={importFormName}
          onChange={(e) => setImportFormName(e.target.value)}
          disabled={importBusy || !excelMeta}
        />

        <EventSelectorAutocomplete
          value={importEventName}
          onChange={setImportEventName}
          required={needsImportEvent}
          reloadToken={`excel-import-page-${eventSelectorReloadToken}`}
          label={
            excelMeta?.hasPerRowEvent
              ? "Default event (for blank Event cells)"
              : "Event"
          }
          onAddRequested={(typedName) => {
            setPendingNewEventName(typedName || "");
            setCreateEventOpen(true);
          }}
          disabled={importBusy || !excelMeta}
        />

        <TextField
          select
          label="User reference ID question"
          fullWidth
          value={importReferenceQuestionIndex}
          onChange={(e) => {
            const nextValue = e.target.value;
            const parsed = Number(nextValue);
            setImportReferenceQuestionIndex(Number.isInteger(parsed) ? parsed : "");
          }}
          disabled={importBusy || !excelMeta || referenceQuestionOptions.length === 0}
          helperText={
            !excelMeta
              ? "Choose an Excel file first."
              : referenceQuestionOptions.length === 0
                ? "No text questions detected. Import can continue without mapping a reference ID."
                : "Optional: pick the text question where users provide their reference ID."
          }
        >
          <MenuItem value="">None</MenuItem>
          {referenceQuestionOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {excelMeta ? (
          <>
            <Typography variant="h6">Data Preview</Typography>
            {excelMeta.previewTruncated ? (
              <Typography variant="caption" color="text.secondary">
                Showing first {excelMeta.previewLimit} rows of {excelMeta.rowCount}.
              </Typography>
            ) : null}
            <DataGrid
              autoHeight
              columns={previewColumns}
              rows={previewRows}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
            />

            <Typography variant="h6">Question Definitions</Typography>
            <DataGrid
              autoHeight
              columns={questionDefinitionColumns}
              rows={questionDefinitionRows}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 5, page: 0 } },
              }}
            />
          </>
        ) : null}

        {importErr ? (
          <Typography color="error" variant="body2">
            {importErr}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button component={Link} to="/surveys" disabled={importBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleExcelImportSubmit} disabled={!canDoImport}>
            Import
          </Button>
        </Stack>
      </Stack>
      </Box>

      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        initialName={pendingNewEventName}
        title="Create Event"
        helperText="Create a new event and it will be selected for this import."
        onCreated={(event) => {
          if (event?.name) {
            setImportEventName(event.name);
          } else if (pendingNewEventName) {
            setImportEventName(pendingNewEventName);
          }
          setEventSelectorReloadToken((prev) => prev + 1);
        }}
      />
    </ContainerWithBackground>
  );
}
