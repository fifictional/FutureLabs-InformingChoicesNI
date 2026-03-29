import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MOCK_SURVEYS = [
  {
    id: 's1',
    name: 'Spring Wellbeing Check-In',
    questions: [
      {
        id: 'q1',
        text: 'How satisfied are you with the support you received?',
        responses: ['Very satisfied', 'Satisfied', 'Satisfied', 'Neutral', 'Very satisfied']
      },
      {
        id: 'q2',
        text: 'How easy was it to access services?',
        responses: ['Easy', 'Very easy', 'Neutral', 'Easy', 'Difficult']
      }
    ]
  },
  {
    id: 's2',
    name: 'Summer Outreach Feedback',
    questions: [
      {
        id: 'q1',
        text: 'How satisfied are you with the support you received?',
        responses: ['Satisfied', 'Satisfied', 'Very satisfied', 'Unsatisfied']
      },
      {
        id: 'q2',
        text: 'Would you recommend this service to others?',
        responses: ['Yes', 'Yes', 'No', 'Yes', 'Yes']
      }
    ]
  },
  {
    id: 's3',
    name: 'Autumn Programme Review',
    questions: [
      {
        id: 'q1',
        text: 'How useful did you find the sessions?',
        responses: ['Very useful', 'Useful', 'Useful', 'Very useful']
      },
      {
        id: 'q2',
        text: 'How satisfied are you with the support you received?',
        responses: ['Neutral', 'Satisfied', 'Very satisfied', 'Satisfied']
      }
    ]
  },
  {
    id: 's4',
    name: 'Winter Family Support Survey',
    questions: [
      {
        id: 'q1',
        text: 'How likely are you to return for future support?',
        responses: ['Likely', 'Very likely', 'Likely', 'Unlikely']
      }
    ]
  }
];

function buildEntryId() {
  return `entry-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuestion(text) {
  return text.trim().toLowerCase();
}

function buildAggregate(selectedQuestionText, selectedSurveyIds) {
  const counts = new Map();

  MOCK_SURVEYS.filter((survey) => selectedSurveyIds.includes(survey.id)).forEach((survey) => {
    const matchingQuestion = survey.questions.find(
      (question) => normalizeQuestion(question.text) === normalizeQuestion(selectedQuestionText)
    );

    if (!matchingQuestion) {
      return;
    }

    matchingQuestion.responses.forEach((answer) => {
      counts.set(answer, (counts.get(answer) || 0) + 1);
    });
  });

  const data = [...counts.entries()]
    .map(([answer, count]) => ({ answer, count }))
    .sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer));

  const totalResponses = data.reduce((accumulator, item) => accumulator + item.count, 0);
  return { data, totalResponses };
}

export default function Analyse() {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorStep, setSelectorStep] = useState('survey');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [analysisEntries, setAnalysisEntries] = useState([]);

  const selectedSurvey = useMemo(
    () => MOCK_SURVEYS.find((survey) => survey.id === selectedSurveyId) || null,
    [selectedSurveyId]
  );

  const selectedSurveyQuestions = selectedSurvey?.questions || [];

  const matchingSurveysByEntry = useMemo(() => {
    const lookup = {};

    analysisEntries.forEach((entry) => {
      lookup[entry.id] = MOCK_SURVEYS.filter((survey) =>
        survey.questions.some(
          (question) => normalizeQuestion(question.text) === normalizeQuestion(entry.questionText)
        )
      );
    });

    return lookup;
  }, [analysisEntries]);

  const aggregateResultByEntry = useMemo(() => {
    const lookup = {};

    analysisEntries.forEach((entry) => {
      if (entry.submittedSurveyIds.length === 0) {
        return;
      }

      lookup[entry.id] = buildAggregate(entry.questionText, entry.submittedSurveyIds);
    });

    return lookup;
  }, [analysisEntries]);

  const handleOpenSelector = () => {
    setIsSelectorOpen(true);
    setSelectorStep('survey');
    setSelectedSurveyId('');
    setSelectedQuestionId('');
  };

  const handleCloseSelector = () => {
    setIsSelectorOpen(false);
    setSelectorStep('survey');
    setSelectedSurveyId('');
    setSelectedQuestionId('');
  };

  const handleContinueToQuestion = () => {
    setSelectorStep('question');
    setSelectedQuestionId('');
  };

  const handleQuestionSelected = (questionId) => {
    const question = selectedSurveyQuestions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    const candidateSurveys = MOCK_SURVEYS.filter((survey) =>
      survey.questions.some(
        (item) => normalizeQuestion(item.text) === normalizeQuestion(question.text)
      )
    );

    const candidateIds = candidateSurveys.map((survey) => survey.id);

    setSelectedQuestionId(question.id);
    setAnalysisEntries((previousEntries) => [
      ...previousEntries,
      {
        id: buildEntryId(),
        sourceSurveyName: selectedSurvey.name,
        questionId: question.id,
        questionText: question.text,
        matchingSurveyIds: candidateIds,
        submittedSurveyIds: []
      }
    ]);
    setIsSelectorOpen(false);
    setSelectorStep('survey');
    setSelectedSurveyId('');
    setSelectedQuestionId('');
  };

  const updateEntry = (entryId, updater) => {
    setAnalysisEntries((previousEntries) =>
      previousEntries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return typeof updater === 'function' ? updater(entry) : { ...entry, ...updater };
      })
    );
  };

  const removeEntry = (entryId) => {
    setAnalysisEntries((previousEntries) =>
      previousEntries.filter((entry) => entry.id !== entryId)
    );
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100%' }}>
      <Stack spacing={2} sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Typography color="text.secondary">
          Compare identical questions across surveys and view a combined response distribution.
        </Typography>

        <Box>
          <Button variant="contained" onClick={handleOpenSelector}>
            Add Survey Question
          </Button>
        </Box>

        {analysisEntries.length === 0 && (
          <Alert severity="info">
            Add one or more survey questions to compare their aggregated responses side by side.
          </Alert>
        )}

        {analysisEntries.map((entry) => {
          const matchingSurveys = matchingSurveysByEntry[entry.id] || [];
          const aggregateResult = aggregateResultByEntry[entry.id] || null;
          const selectedSurveyNames = MOCK_SURVEYS.filter((survey) =>
            entry.submittedSurveyIds.includes(survey.id)
          ).map((survey) => survey.name);
          const selectLabelId = `matching-surveys-label-${entry.id}`;

          return (
            <Card key={entry.id}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={2}>
                    <Box>
                      <Typography variant="h6">{entry.questionText}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Added from {entry.sourceSurveyName} ({entry.questionId})
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Found in {matchingSurveys.length} survey(s). Select one or more surveys to include.
                      </Typography>
                    </Box>
                    <Button color="error" onClick={() => removeEntry(entry.id)}>
                      Remove
                    </Button>
                  </Stack>

                  <FormControl fullWidth>
                    <InputLabel id={selectLabelId}>Matching Surveys</InputLabel>
                    <Select
                      variant="outlined"
                      labelId={selectLabelId}
                      multiple
                      value={entry.matchingSurveyIds}
                      onChange={(event) => {
                        const value = event.target.value;
                        const nextMatchingSurveyIds =
                          typeof value === 'string' ? value.split(',') : value;

                        updateEntry(entry.id, {
                          matchingSurveyIds: nextMatchingSurveyIds,
                          submittedSurveyIds: []
                        });
                      }}
                      input={<OutlinedInput label="Matching Surveys" />}
                      renderValue={(selected) =>
                        MOCK_SURVEYS.filter((survey) => selected.includes(survey.id))
                          .map((survey) => survey.name)
                          .join(', ')
                      }
                    >
                      {matchingSurveys.map((survey) => (
                        <MenuItem key={survey.id} value={survey.id}>
                          <Checkbox checked={entry.matchingSurveyIds.includes(survey.id)} />
                          <ListItemText primary={survey.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box>
                    <Button
                      variant="contained"
                      onClick={() => {
                        updateEntry(entry.id, {
                          submittedSurveyIds: entry.matchingSurveyIds
                        });
                      }}
                      disabled={entry.matchingSurveyIds.length === 0}
                    >
                      Submit Selection
                    </Button>
                  </Box>
                  
                  {aggregateResult && (
                    <Stack spacing={2}>
                      <Typography variant="h6">Aggregated Results</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Combined {aggregateResult.totalResponses} responses from {selectedSurveyNames.length}{' '}
                        survey(s): {selectedSurveyNames.join(', ')}
                      </Typography>

                      <Box sx={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={aggregateResult.data}
                            margin={{ top: 10, right: 24, left: 0, bottom: 8 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="answer"
                              interval={0}
                              angle={-10}
                              textAnchor="end"
                              height={70}
                            />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog open={isSelectorOpen} onClose={handleCloseSelector} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectorStep === 'survey' ? 'Select an Existing Survey' : 'Select a Question'}
        </DialogTitle>

        <DialogContent>
          {selectorStep === 'survey' ? (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="survey-select-label">Survey</InputLabel>
              <Select
                variant="outlined"
                labelId="survey-select-label"
                value={selectedSurveyId}
                label="Survey"
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {MOCK_SURVEYS.map((survey) => (
                  <MenuItem key={survey.id} value={survey.id}>
                    {survey.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="question-select-label">Question</InputLabel>
              <Select
                variant="outlined"
                labelId="question-select-label"
                value={selectedQuestionId}
                label="Question"
                onChange={(event) => handleQuestionSelected(event.target.value)}
              >
                {selectedSurveyQuestions.map((question) => (
                  <MenuItem key={question.id} value={question.id}>
                    {question.text}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseSelector}>Cancel</Button>
          {selectorStep === 'survey' && (
            <Button
              variant="contained"
              onClick={handleContinueToQuestion}
              disabled={!selectedSurveyId}
            >
              Continue
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
