import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import ContainerWithBackground from "../components/common/ContainerWithBackground";
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Typography
} from "@mui/material";
import { ArrowBack, Refresh } from "@mui/icons-material";
import {
    SurveyPropertiesCard,
    QuestionCard,
    parseFormSchema,
    formatAnswerValue,
    getQuestionLabel,
    isNumericResponse,
    extractNumericValue,
    calculateNumericStats,
    calculateXAxisDomain,
    generateCleanTicks
} from "../components/view-form-data";
import { css } from "@emotion/react";

const headerStackCss = css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
`;

const headerTitleCss = css`
    flex: 1;
    font-weight: bold;
    color: #000000;
`;

const loadingStackCss = css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
`;

const contentStackCss = css`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

export default function ViewSurveyData() {
    const [surveyData, setSurveyData] = useState(null);
    const [eventName, setEventName] = useState("Unknown event");
    const [questions, setQuestions] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [responsesByQuestion, setResponsesByQuestion] = useState({});
    const [choicesByQuestion, setChoicesByQuestion] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [textSearchByQuestion, setTextSearchByQuestion] = useState({});
    const { id } = useParams();

    async function fetchSurveyData({ refreshDatabase = false } = {}) {
        setLoading(true);
        setError("");

        try {
            const numericId = Number(id);
            if (!Number.isInteger(numericId)) {
                throw new Error("Invalid survey ID");
            }

            if (refreshDatabase) {
                await window.api.forms.refreshSchemaAndResponses(numericId);
            }

            // Important: findById triggers a Google refresh in the main process,
            // so it must complete before reading submissions/questions.
            const form = await window.api.forms.findById(numericId);

            if (!form) {
                throw new Error("Survey not found");
            }

            const [formQuestions, formSubmissions, allEvents] = await Promise.all([
                window.api.questions.listByForm(numericId),
                window.api.submissions.listByForm(numericId),
                window.api.events.list()
            ]);

            const responsesBySubmissionPairs = await Promise.all(
                formSubmissions.map(async (submission) => {
                    const responses = await window.api.responses.listBySubmission(submission.id);
                    return [submission.id, responses];
                })
            );

            const responsesBySubmission = Object.fromEntries(responsesBySubmissionPairs);
            const groupedByQuestion = {};

            const choicesPairs = await Promise.all(
                formQuestions.map(async (question) => {
                    try {
                        const rows = await window.api.questions.listChoicesByQuestion(question.id);
                        const options = (rows || [])
                            .map((row) => String(row.choiceText || "").trim())
                            .filter(Boolean);
                        return [question.id, options];
                    } catch {
                        return [question.id, []];
                    }
                })
            );
            const choicesMap = Object.fromEntries(choicesPairs);

            formQuestions.forEach((question) => {
                groupedByQuestion[question.id] = [];
            });

            formSubmissions.forEach((submission) => {
                const responses = responsesBySubmission[submission.id] || [];
                responses.forEach((response) => {
                    if (!groupedByQuestion[response.questionId]) {
                        groupedByQuestion[response.questionId] = [];
                    }

                    groupedByQuestion[response.questionId].push(response);
                });
            });

            const linkedEvent = allEvents.find((event) => event.id === form.eventId);

            setSurveyData(form);
            console.log(form);
            setEventName(linkedEvent?.name || "Unknown event");
            setQuestions(formQuestions);
            setSubmissions(formSubmissions);
            setResponsesByQuestion(groupedByQuestion);
            setChoicesByQuestion(choicesMap);
        } catch (error) {
            console.error('Error fetching survey data:', error);
            setError(error?.message || "Failed to load survey data.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (id) {
            fetchSurveyData();
        }
    }, [id]);

    const parsedSchema = useMemo(() => parseFormSchema(surveyData?.schema), [surveyData]);

    const questionCards = useMemo(() => {
        const schemaChoiceOptionsByTitle = new Map();
        if (Array.isArray(parsedSchema?.questions)) {
            for (const item of parsedSchema.questions) {
                const title = String(item?.title || "").trim();
                if (!title) continue;
                const options = Array.isArray(item?.options)
                    ? item.options.map((o) => String(o || "").trim()).filter(Boolean)
                    : [];
                if (options.length > 0) {
                    schemaChoiceOptionsByTitle.set(title.toLowerCase(), options);
                }
            }
        }

        return questions.map((question, index) => {
            const responses = responsesByQuestion[question.id] || [];
            const dbChoices = choicesByQuestion[question.id] || [];
            const schemaChoices =
                schemaChoiceOptionsByTitle.get(String(question.text || "").trim().toLowerCase()) || [];
            const presetChoices = dbChoices.length > 0 ? dbChoices : schemaChoices;
            const hasPresetChoices = presetChoices.length > 0;
            const declaredType = String(question.answerType || "").toLowerCase();

            const numericResponses = responses
                .filter((r) => isNumericResponse(r))
                .map((r) => extractNumericValue(r));

            const textResponses = responses
                .filter((r) => !isNumericResponse(r))
                .map((r) => formatAnswerValue(r));

            const inferredType =
                numericResponses.length > 0 && textResponses.length === 0 ? "number" : "text";
            const viewType =
                declaredType === "choice" || hasPresetChoices
                    ? "choice"
                    : declaredType === "number"
                      ? "number"
                      : declaredType === "text"
                        ? "text"
                        : inferredType;

            let chartData = [];
            let stats = null;
            let textResponseList = [];
            let xAxisDomain = [0, 10];

            if (viewType === "number") {
                stats = calculateNumericStats(numericResponses);
                const countsByBucket = new Map();
                numericResponses.forEach((val) => {
                    countsByBucket.set(String(val), (countsByBucket.get(String(val)) || 0) + 1);
                });
                chartData = [...countsByBucket.entries()]
                    .map(([value, count]) => ({ value: parseFloat(value), count }))
                    .sort((a, b) => a.value - b.value);
                xAxisDomain = calculateXAxisDomain(chartData);
            } else if (viewType === "choice") {
                const countsByText = new Map();

                for (const choice of presetChoices) {
                    countsByText.set(choice, 0);
                }

                responses.forEach((response) => {
                    const raw = String(response?.valueChoice ?? response?.valueText ?? "").trim();
                    if (!raw) {
                        countsByText.set("No answer", (countsByText.get("No answer") || 0) + 1);
                        return;
                    }

                    // Checkbox answers are persisted as "a | b | c"; count each selected option.
                    const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
                    const values = parts.length > 1 ? parts : [raw];
                    values.forEach((value) => {
                        countsByText.set(value, (countsByText.get(value) || 0) + 1);
                    });
                });

                chartData = [...countsByText.entries()]
                    .map(([value, count]) => ({ value, count }))
                    .sort((a, b) => {
                        const aPresetIndex = presetChoices.indexOf(a.value);
                        const bPresetIndex = presetChoices.indexOf(b.value);
                        const aIsPreset = aPresetIndex >= 0;
                        const bIsPreset = bPresetIndex >= 0;

                        if (aIsPreset && bIsPreset) return aPresetIndex - bPresetIndex;
                        if (aIsPreset) return -1;
                        if (bIsPreset) return 1;
                        return b.count - a.count || a.value.localeCompare(b.value);
                    });
            } else {
                const countsByText = new Map();
                const totalTextResponses = textResponses.length;

                for (const choice of presetChoices) {
                    countsByText.set(choice, 0);
                }

                textResponses.forEach((text) => {
                    countsByText.set(text, (countsByText.get(text) || 0) + 1);
                });
                textResponseList = [...countsByText.entries()].map(([text, count]) => ({
                    text,
                    count,
                    percentage:
                        totalTextResponses > 0 ? ((count / totalTextResponses) * 100).toFixed(1) : "0.0"
                }));
            }

            return {
                questionId: question.id,
                label: question.text || getQuestionLabel(index, question, parsedSchema),
                questionText: question.text || getQuestionLabel(index, question, parsedSchema),
                answerType: question.answerType,
                viewType,
                responseCount: responses.length,
                chartData,
                xAxisDomain,
                xAxisTicks: generateCleanTicks(xAxisDomain),
                stats,
                textResponseList,
                presetChoices,
                allResponses: responses
            };
        });
    }, [questions, responsesByQuestion, choicesByQuestion, parsedSchema]);

    if (!id) {
        return (
            <Navigate to="/surveys" />
        );
    }

    return (
        <ContainerWithBackground>
            <Stack css={headerStackCss}>
                <Button variant="contained" color="primary" startIcon={<ArrowBack/>} onClick={() => window.history.back()}>
                    Back to Surveys
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<Refresh />}
                    disabled={loading}
                    onClick={() => fetchSurveyData({ refreshDatabase: true })}
                >
                    Refresh Data
                </Button>
                <Typography variant="h5" css={headerTitleCss}>
                    Viewing Data: {surveyData?.name || "Loading..."}
                </Typography>
            </Stack>

            {loading && (
                <Stack css={loadingStackCss}>
                    <CircularProgress size={24} />
                    <Typography>Loading survey data...</Typography>
                </Stack>
            )}

            {!!error && !loading && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && !error && surveyData && (
                <Stack css={contentStackCss}>
                    <SurveyPropertiesCard
                        surveyData={surveyData}
                        eventName={eventName}
                        questionCount={questions.length}
                        submissionCount={submissions.length}
                    />

                    {questionCards.length === 0 && (
                        <Alert severity="info">No questions found for this survey.</Alert>
                    )}

                    {questionCards.map((question) => (
                        <QuestionCard
                            key={question.questionId}
                            question={question}
                            searchValue={textSearchByQuestion[question.questionId] || ""}
                            onSearchChange={(value) =>
                                setTextSearchByQuestion((prev) => ({
                                    ...prev,
                                    [question.questionId]: value
                                }))
                            }
                        />
                    ))}
                </Stack>
            )}
        </ContainerWithBackground>
    );
}