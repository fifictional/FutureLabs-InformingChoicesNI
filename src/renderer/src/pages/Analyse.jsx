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
  Stack,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MOCK_SURVEYS = [
  {
    id: 's1',
    name: 'Spring Wellbeing Check-In',
    questions: [
      { id: 'q1', text: 'How satisfied are you with the support you received?' },
      { id: 'q2', text: 'How easy was it to access services?' }
    ],
    respondents: [
      {
        respondentId: 'r1',
        answers: { q1: 'Very satisfied', q2: 'Easy' }
      },
      {
        respondentId: 'r2',
        answers: { q1: 'Satisfied', q2: 'Very easy' }
      },
      {
        respondentId: 'r3',
        answers: { q1: 'Satisfied', q2: 'Neutral' }
      },
      {
        respondentId: 'r4',
        answers: { q1: 'Neutral', q2: 'Easy' }
      },
      {
        respondentId: 'r5',
        answers: { q1: 'Very satisfied', q2: 'Difficult' }
      }
    ]
  },
  {
    id: 's2',
    name: 'Summer Outreach Feedback',
    questions: [
      { id: 'q1', text: 'How satisfied are you with the support you received?' },
      { id: 'q3', text: 'Would you recommend this service to others?' }
    ],
    respondents: [
      {
        respondentId: 'r2',
        answers: { q1: 'Satisfied', q3: 'Yes' }
      },
      {
        respondentId: 'r3',
        answers: { q1: 'Very satisfied', q3: 'Yes' }
      },
      {
        respondentId: 'r6',
        answers: { q1: 'Unsatisfied', q3: 'No' }
      },
      {
        respondentId: 'r7',
        answers: { q1: 'Satisfied', q3: 'Yes' }
      },
      {
        respondentId: 'r8',
        answers: { q1: 'Satisfied', q3: 'Yes' }
      }
    ]
  },
  {
    id: 's3',
    name: 'Autumn Programme Review',
    questions: [
      { id: 'q4', text: 'How useful did you find the sessions?' },
      { id: 'q1', text: 'How satisfied are you with the support you received?' }
    ],
    respondents: [
      {
        respondentId: 'r1',
        answers: { q4: 'Very useful', q1: 'Satisfied' }
      },
      {
        respondentId: 'r4',
        answers: { q4: 'Useful', q1: 'Satisfied' }
      },
      {
        respondentId: 'r8',
        answers: { q4: 'Useful', q1: 'Very satisfied' }
      },
      {
        respondentId: 'r9',
        answers: { q4: 'Very useful', q1: 'Satisfied' }
      }
    ]
  },
  {
    id: 's4',
    name: 'Winter Family Support Survey',
    questions: [
      { id: 'q5', text: 'How likely are you to return for future support?' },
      { id: 'q3', text: 'Would you recommend this service to others?' }
    ],
    respondents: [
      {
        respondentId: 'r5',
        answers: { q5: 'Likely', q3: 'Yes' }
      },
      {
        respondentId: 'r6',
        answers: { q5: 'Very likely', q3: 'No' }
      },
      {
        respondentId: 'r10',
        answers: { q5: 'Likely', q3: 'Yes' }
      },
      {
        respondentId: 'r11',
        answers: { q5: 'Unlikely', q3: 'No' }
      }
    ]
  }
];

function buildEntryId(prefix = 'entry') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuestion(text) {
  return text.trim().toLowerCase();
}

function getMatchingSurveyIds(questionText) {
  const normalized = normalizeQuestion(questionText);

  return MOCK_SURVEYS.filter((survey) =>
    survey.questions.some((question) => normalizeQuestion(question.text) === normalized)
  ).map((survey) => survey.id);
}

function collectQuestionResponses(questionText, surveyIds) {
  const normalized = normalizeQuestion(questionText);
  const responses = [];

  MOCK_SURVEYS.filter((survey) => surveyIds.includes(survey.id)).forEach((survey) => {
    const matchingQuestion = survey.questions.find(
      (question) => normalizeQuestion(question.text) === normalized
    );

    if (!matchingQuestion) {
      return;
    }

    survey.respondents.forEach((submission) => {
      const answer = submission.answers[matchingQuestion.id];

      if (!answer) {
        return;
      }

      responses.push({
        respondentId: submission.respondentId,
        answer,
        surveyId: survey.id
      });
    });
  });

  return responses;
}

function aggregateResponses(questionText, surveyIds) {
  const counts = new Map();
  const responses = collectQuestionResponses(questionText, surveyIds);

  responses.forEach((response) => {
    counts.set(response.answer, (counts.get(response.answer) || 0) + 1);
  });

  const data = [...counts.entries()]
    .map(([answer, count]) => ({ answer, count }))
    .sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer));

  return {
    data,
    totalResponses: responses.length
  };
}

function pickSingleAnswerByRespondent(responseRows) {
  const answersByRespondent = new Map();

  responseRows.forEach((response) => {
    if (!answersByRespondent.has(response.respondentId)) {
      answersByRespondent.set(response.respondentId, response.answer);
    }
  });

  return answersByRespondent;
}

function buildComparisonMatrix(questionBlockOne, questionBlockTwo) {
  const firstResponses = collectQuestionResponses(
    questionBlockOne.questionText,
    questionBlockOne.selectedSurveyIds
  );
  const secondResponses = collectQuestionResponses(
    questionBlockTwo.questionText,
    questionBlockTwo.selectedSurveyIds
  );

  const firstByRespondent = pickSingleAnswerByRespondent(firstResponses);
  const secondByRespondent = pickSingleAnswerByRespondent(secondResponses);

  const rowLabels = [...new Set(firstByRespondent.values())].sort((a, b) => a.localeCompare(b));
  const colLabels = [...new Set(secondByRespondent.values())].sort((a, b) => a.localeCompare(b));

  const rowIndex = new Map(rowLabels.map((label, index) => [label, index]));
  const colIndex = new Map(colLabels.map((label, index) => [label, index]));

  const cells = rowLabels.map(() => colLabels.map(() => 0));
  let maxCount = 0;
  let matchedRespondents = 0;

  firstByRespondent.forEach((firstAnswer, respondentId) => {
    const secondAnswer = secondByRespondent.get(respondentId);

    if (!secondAnswer) {
      return;
    }

    const y = rowIndex.get(firstAnswer);
    const x = colIndex.get(secondAnswer);

    if (y === undefined || x === undefined) {
      return;
    }

    cells[y][x] += 1;
    matchedRespondents += 1;
    maxCount = Math.max(maxCount, cells[y][x]);
  });

  return {
    rowLabels,
    colLabels,
    cells,
    maxCount,
    matchedRespondents
  };
}

function buildCellColor(value, maxValue) {
  if (value === 0 || maxValue === 0) {
    return 'rgba(25, 118, 210, 0.08)';
  }

  const intensity = value / maxValue;
  return `rgba(25, 118, 210, ${0.18 + intensity * 0.72})`;
}

function getColumnHeaderHeight(colLabels) {
  const longestLabelLength = colLabels.reduce((max, label) => Math.max(max, label.length), 0);

  return Math.max(72, longestLabelLength * 10 + 16);
}

export default function Analyse() {
  const [isQuestionSelectorOpen, setIsQuestionSelectorOpen] = useState(false);
  const [questionSelectorStep, setQuestionSelectorStep] = useState('survey');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');

  const [isCompareSelectorOpen, setIsCompareSelectorOpen] = useState(false);
  const [compareBlockOneId, setCompareBlockOneId] = useState('');
  const [compareBlockTwoId, setCompareBlockTwoId] = useState('');

  const [questionBlocks, setQuestionBlocks] = useState([]);
  const [comparisonBlocks, setComparisonBlocks] = useState([]);
  const [comparisonDrilldownsById, setComparisonDrilldownsById] = useState({});

  const selectedSurvey = useMemo(
    () => MOCK_SURVEYS.find((survey) => survey.id === selectedSurveyId) || null,
    [selectedSurveyId]
  );

  const selectedSurveyQuestions = selectedSurvey?.questions || [];

  const aggregateByQuestionBlockId = useMemo(() => {
    const lookup = {};

    questionBlocks.forEach((block) => {
      lookup[block.id] = aggregateResponses(block.questionText, block.selectedSurveyIds);
    });

    return lookup;
  }, [questionBlocks]);

  const comparisonResultById = useMemo(() => {
    const lookup = {};

    comparisonBlocks.forEach((comparison) => {
      const first = questionBlocks.find((block) => block.id === comparison.blockOneId);
      const second = questionBlocks.find((block) => block.id === comparison.blockTwoId);

      if (!first || !second || first.selectedSurveyIds.length === 0 || second.selectedSurveyIds.length === 0) {
        return;
      }

      lookup[comparison.id] = {
        title: `${first.questionText} vs ${second.questionText}`,
        result: buildComparisonMatrix(first, second)
      };
    });

    return lookup;
  }, [comparisonBlocks, questionBlocks]);

  const handleOpenQuestionSelector = () => {
    setIsQuestionSelectorOpen(true);
    setQuestionSelectorStep('survey');
    setSelectedSurveyId('');
    setSelectedQuestionId('');
  };

  const handleCloseQuestionSelector = () => {
    setIsQuestionSelectorOpen(false);
    setQuestionSelectorStep('survey');
    setSelectedSurveyId('');
    setSelectedQuestionId('');
  };

  const handleOpenCompareSelector = () => {
    setIsCompareSelectorOpen(true);
    setCompareBlockOneId('');
    setCompareBlockTwoId('');
  };

  const handleCloseCompareSelector = () => {
    setIsCompareSelectorOpen(false);
    setCompareBlockOneId('');
    setCompareBlockTwoId('');
  };

  const handleContinueToQuestion = () => {
    setQuestionSelectorStep('question');
    setSelectedQuestionId('');
  };

  const handleQuestionSelected = (questionId) => {
    const question = selectedSurveyQuestions.find((item) => item.id === questionId);

    if (!question || !selectedSurvey) {
      return;
    }

    const matchingSurveyIds = getMatchingSurveyIds(question.text);

    setSelectedQuestionId(question.id);
    setQuestionBlocks((previousBlocks) => [
      ...previousBlocks,
      {
        id: buildEntryId('question-block'),
        sourceSurveyName: selectedSurvey.name,
        sourceSurveyId: selectedSurvey.id,
        questionId: question.id,
        questionText: question.text,
        matchingSurveyIds,
        selectedSurveyIds: [selectedSurvey.id]
      }
    ]);

    handleCloseQuestionSelector();
  };

  const updateQuestionBlock = (blockId, updater) => {
    setQuestionBlocks((previousBlocks) =>
      previousBlocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return typeof updater === 'function' ? updater(block) : { ...block, ...updater };
      })
    );
  };

  const removeQuestionBlock = (blockId) => {
    setQuestionBlocks((previousBlocks) => previousBlocks.filter((block) => block.id !== blockId));
    setComparisonBlocks((previousComparisons) =>
      previousComparisons.filter(
        (comparison) => comparison.blockOneId !== blockId && comparison.blockTwoId !== blockId
      )
    );
  };

  const maybeCreateComparison = (firstId, secondId) => {
    if (!firstId || !secondId || firstId === secondId) {
      return;
    }

    setComparisonBlocks((previousComparisons) => [
      ...previousComparisons,
      {
        id: buildEntryId('comparison-block'),
        blockOneId: firstId,
        blockTwoId: secondId
      }
    ]);

    handleCloseCompareSelector();
  };

  const addComparisonDrilldown = (comparisonId, drilldown) => {
    setComparisonDrilldownsById((previous) => ({
      ...previous,
      [comparisonId]: { id: buildEntryId('drilldown-chart'), ...drilldown }
    }));
  };

  const addRowDrilldown = (comparisonId, result, rowIndex, rowLabel) => {
    const data = result.colLabels.map((columnLabel, columnIndex) => ({
      category: columnLabel,
      count: result.cells[rowIndex][columnIndex]
    }));

    addComparisonDrilldown(comparisonId, {
      title: `Row breakdown: ${rowLabel}`,
      data
    });
  };

  const addColumnDrilldown = (comparisonId, result, columnIndex, columnLabel) => {
    const data = result.rowLabels.map((rowLabel, rowIndex) => ({
      category: rowLabel,
      count: result.cells[rowIndex][columnIndex]
    }));

    addComparisonDrilldown(comparisonId, {
      title: `Column breakdown: ${columnLabel}`,
      data
    });
  };

  const clearComparisonDrilldowns = (comparisonId) => {
    setComparisonDrilldownsById((previous) => {
      if (!previous[comparisonId]) {
        return previous;
      }

      const next = { ...previous };
      delete next[comparisonId];
      return next;
    });
  };

  useEffect(() => {
    const validComparisonIds = new Set(comparisonBlocks.map((comparison) => comparison.id));

    setComparisonDrilldownsById((previous) => {
      const next = {};
      let changed = false;

      Object.entries(previous).forEach(([comparisonId, drilldowns]) => {
        if (validComparisonIds.has(comparisonId)) {
          next[comparisonId] = drilldowns;
          return;
        }

        changed = true;
      });

      return changed ? next : previous;
    });
  }, [comparisonBlocks]);

  const buildQuestionBlockSelectLabel = (block) => {
    const selectedSurveyNames = MOCK_SURVEYS.filter((survey) =>
      block.selectedSurveyIds.includes(survey.id)
    ).map((survey) => survey.name);

    const selectedSurveyText =
      selectedSurveyNames.length > 0 ? selectedSurveyNames.join(', ') : 'No surveys selected';

    return `${block.questionText} (Selected surveys: ${selectedSurveyText})`;
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100%' }}>
      <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Typography variant="h4" fontWeight={700}>
          Analyse Survey Questions
        </Typography>
        <Typography color="text.secondary">
          Add question blocks to aggregate responses, then compare any two blocks with a respondent-level heat map.
        </Typography>

        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={handleOpenQuestionSelector}>
            Add Question
          </Button>
          <Button
            variant="outlined"
            onClick={handleOpenCompareSelector}
            disabled={questionBlocks.length < 2}
          >
            Compare Question
          </Button>
        </Stack>

        {questionBlocks.length === 0 && (
          <Alert severity="info">
            Add a question to start building analysis blocks. Each block can include one or more matching surveys.
          </Alert>
        )}

        {questionBlocks.map((block) => {
          const aggregateResult = aggregateByQuestionBlockId[block.id] || { data: [], totalResponses: 0 };
          const surveyNames = MOCK_SURVEYS.filter((survey) => block.selectedSurveyIds.includes(survey.id)).map(
            (survey) => survey.name
          );
          const selectLabelId = `matching-surveys-label-${block.id}`;

          return (
            <Card key={block.id}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="start"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h6">{block.questionText}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Added from {block.sourceSurveyName} ({block.questionId})
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        Select surveys containing this question to update the graph.
                      </Typography>
                    </Box>
                    <Button color="error" onClick={() => removeQuestionBlock(block.id)}>
                      Remove
                    </Button>
                  </Stack>

                  <FormControl fullWidth>
                    <InputLabel id={selectLabelId}>Matching Surveys</InputLabel>
                    <Select
                      variant="outlined"
                      labelId={selectLabelId}
                      multiple
                      value={block.selectedSurveyIds}
                      onChange={(event) => {
                        const value = event.target.value;
                        const nextSelectedSurveyIds = typeof value === 'string' ? value.split(',') : value;

                        updateQuestionBlock(block.id, {
                          selectedSurveyIds: nextSelectedSurveyIds
                        });
                      }}
                      input={<OutlinedInput label="Matching Surveys" />}
                      renderValue={(selected) =>
                        MOCK_SURVEYS.filter((survey) => selected.includes(survey.id))
                          .map((survey) => survey.name)
                          .join(', ')
                      }
                    >
                      {MOCK_SURVEYS.filter((survey) => block.matchingSurveyIds.includes(survey.id)).map((survey) => (
                        <MenuItem key={survey.id} value={survey.id}>
                          <Checkbox checked={block.selectedSurveyIds.includes(survey.id)} />
                          <ListItemText primary={survey.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack spacing={1}>
                    <Typography color="text.secondary" variant="body2">
                      Aggregated {aggregateResult.totalResponses} responses from {surveyNames.length} survey(s)
                      {surveyNames.length > 0 ? `: ${surveyNames.join(', ')}` : ''}
                    </Typography>
                  </Stack>

                  {aggregateResult.data.length > 0 ? (
                    <Box sx={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={aggregateResult.data}
                          margin={{ top: 10, right: 24, left: 0, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="answer" interval={0} angle={-10} textAnchor="end" height={70} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Alert severity="warning">No responses available for the currently selected surveys.</Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        {comparisonBlocks.length > 0 && (
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700}>
              Comparison Blocks
            </Typography>

            {comparisonBlocks.map((comparison) => {
              const comparisonEntry = comparisonResultById[comparison.id];
              const activeDrilldown = comparisonDrilldownsById[comparison.id] || null;

              if (!comparisonEntry) {
                return (
                  <Alert key={comparison.id} severity="warning">
                    This comparison is unavailable because one or both selected question blocks no longer
                    have valid survey selections.
                  </Alert>
                );
              }

              const { result, title } = comparisonEntry;
              const columnHeaderHeight = getColumnHeaderHeight(result.colLabels);

              return (
                <Card key={comparison.id}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">{title}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Heat map built from {result.matchedRespondents} respondent(s) who answered both
                        selected questions.
                      </Typography>

                      {result.rowLabels.length === 0 || result.colLabels.length === 0 ? (
                        <Alert severity="warning">
                          No overlapping response values available to render this comparison.
                        </Alert>
                      ) : (
                        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Box
                            sx={{
                              '--hm-cell-size': { xs: '56px', sm: '64px' },
                              '--hm-header-row-size': `${columnHeaderHeight}px`,
                              '--hm-label-col': '220px',
                              display: 'grid',
                              gridTemplateColumns: `var(--hm-label-col) repeat(${result.colLabels.length}, var(--hm-cell-size))`,
                              gridTemplateRows: `var(--hm-header-row-size) repeat(${result.rowLabels.length}, var(--hm-cell-size))`,
                              width: 'max-content',
                              minWidth: '100%'
                            }}
                          >
                            <Box
                              sx={{
                                px: 1,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                height: 'var(--hm-header-row-size)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center'
                              }}
                            />
                            {result.colLabels.map((columnLabel) => (
                              <Box
                                key={`column-${comparison.id}-${columnLabel}`}
                                component="button"
                                type="button"
                                onClick={() =>
                                  addColumnDrilldown(
                                    comparison.id,
                                    result,
                                    result.colLabels.indexOf(columnLabel),
                                    columnLabel
                                  )
                                }
                                sx={{
                                  all: 'unset',
                                  px: 1,
                                  borderLeft: '1px solid',
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  fontWeight: 400,
                                  display: 'flex',
                                  height: 'var(--hm-header-row-size)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textAlign: 'center',
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'mixed',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'action.hover'
                                  }
                                }}
                                title={columnLabel}
                              >
                                {columnLabel}
                              </Box>
                            ))}

                            {result.rowLabels.map((rowLabel, rowIndex) => (
                              <Box key={`row-${comparison.id}-${rowLabel}`} sx={{ display: 'contents' }}>
                                <Box
                                  component="button"
                                  type="button"
                                  onClick={() => addRowDrilldown(comparison.id, result, rowIndex, rowLabel)}
                                  sx={{
                                    all: 'unset',
                                    px: 1,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    fontWeight: 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      backgroundColor: 'action.hover'
                                    }
                                  }}
                                  title={rowLabel}
                                >
                                  {rowLabel}
                                </Box>

                                {result.colLabels.map((columnLabel, columnIndex) => {
                                  const value = result.cells[rowIndex][columnIndex];

                                  return (
                                    <Box
                                      key={`cell-${comparison.id}-${rowLabel}-${columnLabel}`}
                                      sx={{
                                        width: 'var(--hm-cell-size)',
                                        height: 'var(--hm-cell-size)',
                                        aspectRatio: '1 / 1',
                                        borderLeft: '1px solid',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        color: value > 0 ? '#fff' : 'text.primary',
                                        backgroundColor: buildCellColor(value, result.maxCount)
                                      }}
                                    >
                                      {value}
                                    </Box>
                                  );
                                })}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {activeDrilldown && (
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                              Drilldown Charts
                            </Typography>
                            <Button size="small" onClick={() => clearComparisonDrilldowns(comparison.id)}>
                              Clear
                            </Button>
                          </Stack>

                          <Box key={activeDrilldown.id} sx={{ width: '100%', height: 260 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {activeDrilldown.title}
                            </Typography>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={activeDrilldown.data}
                                margin={{ top: 8, right: 24, left: 0, bottom: 12 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" interval={0} angle={-10} textAnchor="end" height={70} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
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
        )}
      </Stack>

      <Dialog open={isQuestionSelectorOpen} onClose={handleCloseQuestionSelector} fullWidth maxWidth="sm">
        <DialogTitle>
          {questionSelectorStep === 'survey' ? 'Select an Existing Survey' : 'Select a Question'}
        </DialogTitle>

        <DialogContent>
          {questionSelectorStep === 'survey' ? (
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
          <Button onClick={handleCloseQuestionSelector}>Cancel</Button>
          {questionSelectorStep === 'survey' && (
            <Button variant="contained" onClick={handleContinueToQuestion} disabled={!selectedSurveyId}>
              Continue
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={isCompareSelectorOpen} onClose={handleCloseCompareSelector} fullWidth maxWidth="sm">
        <DialogTitle>Select Two Question Blocks</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="compare-question-one-label">Question Block 1</InputLabel>
              <Select
                variant="outlined"
                labelId="compare-question-one-label"
                value={compareBlockOneId}
                label="Question Block 1"
                onChange={(event) => {
                  const nextFirstId = event.target.value;

                  setCompareBlockOneId(nextFirstId);
                  maybeCreateComparison(nextFirstId, compareBlockTwoId);
                }}
              >
                {questionBlocks.map((block) => (
                  <MenuItem key={block.id} value={block.id}>
                    {buildQuestionBlockSelectLabel(block)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="compare-question-two-label">Question Block 2</InputLabel>
              <Select
                variant="outlined"
                labelId="compare-question-two-label"
                value={compareBlockTwoId}
                label="Question Block 2"
                onChange={(event) => {
                  const nextSecondId = event.target.value;

                  setCompareBlockTwoId(nextSecondId);
                  maybeCreateComparison(compareBlockOneId, nextSecondId);
                }}
              >
                {questionBlocks.map((block) => (
                  <MenuItem key={block.id} value={block.id} disabled={block.id === compareBlockOneId}>
                    {buildQuestionBlockSelectLabel(block)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseCompareSelector}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
