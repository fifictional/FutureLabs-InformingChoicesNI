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
import { ArrowBack } from "@mui/icons-material";
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [textSearchByQuestion, setTextSearchByQuestion] = useState({});
    const { id } = useParams();

    useEffect(() => {
        async function fetchSurveyData() {
            setLoading(true);
            setError("");

            try {
                const numericId = Number(id);
                if (!Number.isInteger(numericId)) {
                    throw new Error("Invalid survey ID");
                }

                const [form, formQuestions, formSubmissions, allEvents] = await Promise.all([
                    window.api.forms.findById(numericId),
                    window.api.questions.listByForm(numericId),
                    window.api.submissions.listByForm(numericId),
                    window.api.events.list()
                ]);

                if (!form) {
                    throw new Error("Survey not found");
                }

                const responsesBySubmissionPairs = await Promise.all(
                    formSubmissions.map(async (submission) => {
                        const responses = await window.api.responses.listBySubmission(submission.id);
                        return [submission.id, responses];
                    })
                );

                const responsesBySubmission = Object.fromEntries(responsesBySubmissionPairs);
                const groupedByQuestion = {};

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
                setEventName(linkedEvent?.name || "Unknown event");
                setQuestions(formQuestions);
                setSubmissions(formSubmissions);
                setResponsesByQuestion(groupedByQuestion);
            } catch (error) {
                console.error('Error fetching survey data:', error);
                setError(error?.message || "Failed to load survey data.");
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchSurveyData();
        }
    }, [id]);

    const parsedSchema = useMemo(() => parseFormSchema(surveyData?.schema), [surveyData]);

    const questionCards = useMemo(() => {
        return questions.map((question, index) => {
            const responses = responsesByQuestion[question.id] || [];

            const numericResponses = responses
                .filter((r) => isNumericResponse(r))
                .map((r) => extractNumericValue(r));

            const textResponses = responses
                .filter((r) => !isNumericResponse(r))
                .map((r) => formatAnswerValue(r));

            const isNumericQuestion = numericResponses.length > 0 && textResponses.length === 0;

            let chartData = [];
            let stats = null;
            let textResponseList = [];
            let xAxisDomain = [0, 10];

            if (isNumericQuestion) {
                stats = calculateNumericStats(numericResponses);
                const countsByBucket = new Map();
                numericResponses.forEach((val) => {
                    countsByBucket.set(String(val), (countsByBucket.get(String(val)) || 0) + 1);
                });
                chartData = [...countsByBucket.entries()]
                    .map(([value, count]) => ({ value: parseFloat(value), count }))
                    .sort((a, b) => a.value - b.value);
                xAxisDomain = calculateXAxisDomain(chartData);
            } else {
                const countsByText = new Map();
                textResponses.forEach((text) => {
                    countsByText.set(text, (countsByText.get(text) || 0) + 1);
                });
                textResponseList = [...countsByText.entries()].map(([text, count]) => ({
                    text,
                    count,
                    percentage: ((count / textResponses.length) * 100).toFixed(1)
                }));
            }

            return {
                questionId: question.id,
                label: getQuestionLabel(index, question, parsedSchema),
                responseCount: responses.length,
                isNumeric: isNumericQuestion,
                chartData,
                xAxisDomain,
                xAxisTicks: generateCleanTicks(xAxisDomain),
                stats,
                textResponseList,
                allResponses: responses
            };
        });
    }, [questions, responsesByQuestion, parsedSchema]);

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