import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

function toBaseFormLink(survey) {
    if (survey?.baseLink) return survey.baseLink;
    if (survey?.externalId) return `https://docs.google.com/forms/d/${survey.externalId}/viewform`;
    return "";
}

function buildPrefilledLink(baseLink, questionEntryId, value) {
    const url = new URL(baseLink);
    url.searchParams.set("usp", "pp_url");
    url.searchParams.set(`entry.${questionEntryId}`, value);
    return url.toString();
}

export default function GetUserSpecificLinkDialog({ open, onClose, survey }) {
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [dbQuestions, setDbQuestions] = useState([]);
    const [selectedEntryId, setSelectedEntryId] = useState("");
    const [identifierValue, setIdentifierValue] = useState("");
    const [generatedLink, setGeneratedLink] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const possibleDefaultReferenceQuestionPatterns = [
        /reference/i,
        /ref\s*id/i,
        /user\s*id/i,
        /participant\s*id/i,
        /identifier/i
    ];

    const schemaQuestions = useMemo(() => {
        const questions = Array.isArray(survey?.schema?.questions) ? survey.schema.questions : [];
        return questions
            .map((q, index) => ({
                entryId: String(q?.questionId || "").trim(),
                title: String(q?.title || `Question ${index + 1}`).trim()
            }))
            .filter((q) => q.entryId);
    }, [survey]);

    const questionOptions = useMemo(() => {
        const byTitle = new Map(
            schemaQuestions.map((q) => [q.title.trim().toLowerCase(), q.entryId])
        );

        if (dbQuestions.length > 0) {
            return dbQuestions
                .map((q, index) => {
                    const title = String(q?.text || `Question ${index + 1}`).trim();
                    const entryId = byTitle.get(title.toLowerCase()) || schemaQuestions[index]?.entryId || "";
                    return {
                        dbQuestionId: q.id,
                        title,
                        answerType: q.answerType,
                        entryId
                    };
                })
                .filter((q) => q.entryId);
        }

        return schemaQuestions.map((q, index) => ({
            dbQuestionId: `schema-${index}`,
            title: q.title,
            answerType: null,
            entryId: q.entryId
        }));
    }, [dbQuestions, schemaQuestions]);

    const baseFormLink = useMemo(() => toBaseFormLink(survey), [survey]);

    useEffect(() => {
        async function fetchDbQuestions() {
            if (!open || !survey?.id) return;
            setLoadingQuestions(true);
            try {
                const rows = await window.api.questions.listByForm(survey.id);
                console.log("Fetched DB questions for form", survey.id, rows);
                setDbQuestions(Array.isArray(rows) ? rows : []);
            } catch {
                setDbQuestions([]);
            } finally {
                setLoadingQuestions(false);
            }
        }

        fetchDbQuestions();
    }, [open, survey]);

    useEffect(() => {
        if (!open) return;
        setGeneratedLink("");
        setIdentifierValue("");
        setError("");
        setCopied(false);

        const defaultQuestion = questionOptions.find((q) =>
            possibleDefaultReferenceQuestionPatterns.some((pattern) => pattern.test(q.title))
        );
        setSelectedEntryId(defaultQuestion?.entryId || questionOptions[0]?.entryId || "");
    }, [open, questionOptions]);

    if (!survey || survey.provider !== "google_forms") {
        return null;
    }

    async function handleGenerate() {
        setCopied(false);
        setError("");

        const value = identifierValue.trim();
        if (!selectedEntryId) {
            setError("Select the reference question first.");
            return;
        }
        if (!value) {
            setError("Enter a user identifier value.");
            return;
        }
        if (!baseFormLink) {
            setError("No Google Form link is available for this survey.");
            return;
        }

        try {
            const link = buildPrefilledLink(baseFormLink, selectedEntryId, value);
            setGeneratedLink(link);
        } catch {
            setError("Could not generate a prefilled link for this survey.");
        }
    }

    async function handleCopy() {
        if (!generatedLink) return;
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
        } catch {
            setError("Copy failed. You can still copy the link manually.");
        }
    }

    function handleOpenLink() {
        if (!generatedLink) return;
        window.api.googleForms.openInBrowserByBaseLink(generatedLink);
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Get User-Specific Link</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2">
                        Select the question that stores the user identifier, enter a value, and generate a
                        prefilled Google Form link.
                    </Typography>

                    {!questionOptions.length && (
                        <Alert severity="warning">
                            No mappable questions were found. This survey needs Google question IDs in schema metadata.
                        </Alert>
                    )}

                    {loadingQuestions && <Typography variant="body2">Loading questions...</Typography>}

                    <FormControl fullWidth size="small" disabled={!questionOptions.length || loadingQuestions}>
                        <InputLabel id="reference-question-select-label">Reference Question</InputLabel>
                        <Select
                            labelId="reference-question-select-label"
                            value={selectedEntryId}
                            label="Reference Question"
                            onChange={(e) => setSelectedEntryId(String(e.target.value))}
                        >
                            {questionOptions.map((q) => (
                                <MenuItem key={`${q.dbQuestionId}-${q.entryId}`} value={q.entryId}>
                                    {q.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        size="small"
                        label="User Identifier Value"
                        value={identifierValue}
                        onChange={(e) => setIdentifierValue(e.target.value)}
                        placeholder="e.g. ABC12345"
                    />

                    <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={!questionOptions.length || !identifierValue.trim()}
                    >
                        Generate Prefilled Link
                    </Button>

                    {!!generatedLink && (
                        <Stack spacing={1}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                label="Generated Link"
                                value={generatedLink}
                                InputProps={{ readOnly: true }}
                            />
                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" onClick={handleCopy}>
                                    {copied ? "Copied" : "Copy Link"}
                                </Button>
                                <Button variant="outlined" onClick={handleOpenLink}>
                                    Open Link
                                </Button>
                            </Stack>
                        </Stack>
                    )}

                    {!!error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}