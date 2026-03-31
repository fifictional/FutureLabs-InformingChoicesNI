import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import ContainerWithBackground from "../components/common/ContainerWithBackground";
import EventSelectorAutocomplete from "../components/events/EventSelectorAutocomplete.jsx";
import CreateEventDialog from "../components/events/CreateEventDialog.jsx";

function buildInitialConfig(existing, form) {
  return {
    eventName: existing?.eventName || "",
    formName: existing?.formName || form.name || "",
    userReferenceQuestionId: existing?.userReferenceQuestionId || "",
    busy: false,
    done: Boolean(existing?.done),
    error: "",
  };
}

export default function GoogleFormsImportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedForms, setSelectedForms] = useState([]);
  const [configsById, setConfigsById] = useState({});
  const [referenceQuestionsByFormId, setReferenceQuestionsByFormId] = useState({});
  const [referenceQuestionsLoadingByFormId, setReferenceQuestionsLoadingByFormId] = useState({});
  const [initializedFromNavigation, setInitializedFromNavigation] = useState(false);

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [pendingNewEventName, setPendingNewEventName] = useState("");
  const [createEventTargetFormId, setCreateEventTargetFormId] = useState(null);
  const [eventSelectorReloadToken, setEventSelectorReloadToken] = useState(0);

  const selectedCount = selectedForms.length;
  const importedCount = useMemo(() => {
    return selectedForms.filter((form) => configsById[form.id]?.done).length;
  }, [configsById, selectedForms]);
  const pendingCount = useMemo(() => {
    return selectedForms.filter((form) => !configsById[form.id]?.done).length;
  }, [configsById, selectedForms]);

  useEffect(() => {
    const selectedFormIds = location.state?.selectedFormIds;
    const selectedFormObjects = location.state?.selectedForms;

    if (Array.isArray(selectedFormIds) && selectedFormIds.length > 0) {
      handleFormsPicked(
        selectedFormIds,
        Array.isArray(selectedFormObjects) ? selectedFormObjects : []
      );
    }
    setInitializedFromNavigation(true);
  }, [location.state]);

  useEffect(() => {
    if (initializedFromNavigation && pendingCount === 0) {
      navigate("/surveys");
    }
  }, [initializedFromNavigation, navigate, pendingCount]);

  function handleFormsPicked(selectedFormIds, selectedFormObjects = []) {
    const selectedMap = new Map(selectedFormObjects.map((form) => [form.id, form]));

    const nextSelectedForms = selectedFormIds.map((id) => {
      const form = selectedMap.get(id);
      return {
        id,
        name: form?.name || "Untitled Form",
      };
    });

    setSelectedForms(nextSelectedForms);
    setConfigsById((prev) => {
      const next = {};
      nextSelectedForms.forEach((form) => {
        next[form.id] = buildInitialConfig(prev[form.id], form);
      });
      return next;
    });
  }

  function updateFormConfig(formId, updater) {
    setConfigsById((prev) => {
      const current = prev[formId] || {
        eventName: "",
        formName: "",
        userReferenceQuestionId: "",
        busy: false,
        done: false,
        error: "",
      };
      return {
        ...prev,
        [formId]: updater(current),
      };
    });
  }

  function abortFormImport(formId) {
    setSelectedForms((prev) => prev.filter((form) => form.id !== formId));
    setConfigsById((prev) => {
      const next = { ...prev };
      delete next[formId];
      return next;
    });
    setReferenceQuestionsByFormId((prev) => {
      const next = { ...prev };
      delete next[formId];
      return next;
    });
    setReferenceQuestionsLoadingByFormId((prev) => {
      const next = { ...prev };
      delete next[formId];
      return next;
    });
  }

  async function fetchReferenceQuestions(formId) {
    setReferenceQuestionsLoadingByFormId((prev) => ({ ...prev, [formId]: true }));
    try {
      const questions = await window.api.googleForms.listReferenceQuestions(formId);
      const options = Array.isArray(questions) ? questions : [];
      setReferenceQuestionsByFormId((prev) => ({ ...prev, [formId]: options }));
      updateFormConfig(formId, (current) => ({
        ...current,
        userReferenceQuestionId:
          current.userReferenceQuestionId || (options[0]?.id ? String(options[0].id) : ""),
      }));
    } catch (err) {
      setReferenceQuestionsByFormId((prev) => ({ ...prev, [formId]: [] }));
      updateFormConfig(formId, (current) => ({
        ...current,
        error: err?.message || String(err),
      }));
    } finally {
      setReferenceQuestionsLoadingByFormId((prev) => ({ ...prev, [formId]: false }));
    }
  }

  useEffect(() => {
    selectedForms.forEach((form) => {
      if (referenceQuestionsByFormId[form.id] || referenceQuestionsLoadingByFormId[form.id]) return;
      fetchReferenceQuestions(form.id);
    });
  }, [referenceQuestionsByFormId, referenceQuestionsLoadingByFormId, selectedForms]);

  async function importSingleForm(formId) {
    const cfg = configsById[formId];
    if (!cfg) return;

    if (!cfg.eventName.trim()) {
      updateFormConfig(formId, (current) => ({ ...current, error: "Event name is required." }));
      return;
    }

    updateFormConfig(formId, (current) => ({ ...current, busy: true, error: "" }));

    try {
      const result = await window.api.googleForms.importSelected({
        formIds: [formId],
        eventName: cfg.eventName.trim(),
        formNameOverride: cfg.formName.trim() || undefined,
        userReferenceQuestionId: cfg.userReferenceQuestionId,
      });

      if (!result?.ok) {
        updateFormConfig(formId, (current) => ({
          ...current,
          busy: false,
          done: false,
          error: result?.error || "Import failed",
        }));
        return;
      }

      updateFormConfig(formId, (current) => ({
        ...current,
        busy: false,
        done: true,
        error: "",
      }));
    } catch (err) {
      updateFormConfig(formId, (current) => ({
        ...current,
        busy: false,
        done: false,
        error: err?.message || String(err),
      }));
    }
  }

  return (
    <ContainerWithBackground>
      <Box sx={{ maxWidth: 1200, width: "100%", mx: "auto" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold" color="#000000">
            Import Surveys From Google Forms
          </Typography>
          <Button component={Link} to="/surveys">
            Back to Surveys
          </Button>
        </Stack>

        <Typography variant="body2">
          Import each selected Google Form one-by-one with its own event and survey name.
        </Typography>

        <Divider />

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            Selected Forms
          </Typography>
          <Chip size="small" label={`${importedCount}/${selectedCount} imported`} />
        </Stack>

        {selectedCount === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No pending forms found. Start from Surveys and choose Import Surveys, then From Google Drive.
          </Typography>
        ) : null}

        {selectedForms.map((form) => {
          const referenceQuestions = referenceQuestionsByFormId[form.id] || [];
          const isLoadingReferenceQuestions = Boolean(referenceQuestionsLoadingByFormId[form.id]);
          const cfg = configsById[form.id] || {
            eventName: "",
            formName: form.name || "",
            userReferenceQuestionId: "",
            busy: false,
            done: false,
            error: "",
          };

          return (
            <Card key={form.id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{form.name || "Untitled Form"}</Typography>
                    <Chip
                      size="small"
                      color={cfg.done ? "success" : "default"}
                      label={cfg.done ? "Imported" : "Pending"}
                    />
                  </Stack>

                  <TextField
                    label="Survey name"
                    fullWidth
                    value={cfg.formName}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      updateFormConfig(form.id, (current) => ({ ...current, formName: nextValue }));
                    }}
                    disabled={cfg.busy}
                  />

                  <EventSelectorAutocomplete
                    value={cfg.eventName}
                    onChange={(nextEventName) => {
                      updateFormConfig(form.id, (current) => ({
                        ...current,
                        eventName: nextEventName,
                      }));
                    }}
                    required
                    disabled={cfg.busy}
                    reloadToken={`google-import-page-${form.id}-${eventSelectorReloadToken}`}
                    label="Event"
                    onAddRequested={(typedName) => {
                      setPendingNewEventName(typedName || "");
                      setCreateEventTargetFormId(form.id);
                      setCreateEventOpen(true);
                    }}
                  />

                  <TextField
                    select
                    label="User reference ID question"
                    fullWidth
                    value={cfg.userReferenceQuestionId || ""}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      updateFormConfig(form.id, (current) => ({
                        ...current,
                        userReferenceQuestionId: nextValue,
                      }));
                    }}
                    disabled={cfg.busy || isLoadingReferenceQuestions || cfg.done}
                    helperText={
                      isLoadingReferenceQuestions
                        ? "Loading text questions from Google Form..."
                        : referenceQuestions.length === 0
                          ? "No text questions found. Continue without mapping a reference ID, or add one in Google Forms."
                          : "Optional: pick the text question where users enter their reference ID."
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    {referenceQuestions.map((q) => (
                      <MenuItem key={q.id} value={q.id}>
                        {q.title}
                      </MenuItem>
                    ))}
                  </TextField>

                  {cfg.error ? (
                    <Typography color="error" variant="body2">
                      {cfg.error}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => abortFormImport(form.id)}
                      disabled={cfg.busy}
                    >
                      Abort
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => importSingleForm(form.id)}
                      disabled={cfg.busy || cfg.done}
                    >
                      {cfg.busy ? "Importing..." : cfg.done ? "Imported" : "Import Form"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
      </Box>

      <CreateEventDialog
        open={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        initialName={pendingNewEventName}
        title="Create Event"
        helperText="Create a new event and it will be selected for this form import."
        onCreated={(event) => {
          if (!createEventTargetFormId) return;

          const createdEventName = event?.name || pendingNewEventName;
          updateFormConfig(createEventTargetFormId, (current) => ({
            ...current,
            eventName: createdEventName,
          }));
          setEventSelectorReloadToken((prev) => prev + 1);
        }}
      />
    </ContainerWithBackground>
  );
}
