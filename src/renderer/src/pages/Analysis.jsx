/* eslint-disable react/prop-types */

import { Add, ArrowDropDown } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ChoiceBarChart,
  EmptyChart,
  HeatMapChart,
  NumericHistogramChart,
  ScatterComparisonChart,
  StackedHistogramChart,
  WordCloudChart
} from '../components/analysis/AnalysisCharts.jsx';
import QuestionSelectorDialog from '../components/analysis/QuestionSelectorDialog.jsx';

const BLOCK_TYPES = {
  QUESTION: 'question',
  COMPARISON: 'comparison',
  WORD_CLOUD: 'word_cloud'
};

function buildId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuestionText(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildQuestionKey(text, answerType) {
  return `${normalizeQuestionText(text)}::${String(answerType || '').toLowerCase()}`;
}

function toDateMs(value) {
  if (!value) return null;
  const parsed = new Date(value);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function toDateInputValue(ms) {
  if (!Number.isFinite(ms)) {
    return null;
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function matchesRange(submittedAtMs, startDate, endDate) {
  if (!Number.isFinite(submittedAtMs)) {
    return false;
  }
  const startMs = startDate ? toDateMs(`${startDate}T00:00:00`) : null;
  const endMs = endDate ? toDateMs(`${endDate}T23:59:59.999`) : null;

  if (startMs != null && submittedAtMs < startMs) {
    return false;
  }
  if (endMs != null && submittedAtMs > endMs) {
    return false;
  }
  return true;
}

function parseResponseValues(response, answerType) {
  if (answerType === 'number') {
    if (response?.valueNumber != null && Number.isFinite(response.valueNumber)) {
      return [response.valueNumber];
    }

    const textNumber = Number(response?.valueText);
    if (Number.isFinite(textNumber)) {
      return [textNumber];
    }
    return [];
  }

  if (answerType === 'choice') {
    const raw = String(response?.valueChoice ?? response?.valueText ?? '').trim();
    if (!raw) {
      return [];
    }

    const parts = raw
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length ? parts : [raw];
  }

  const text = String(response?.valueText ?? response?.valueChoice ?? '').trim();
  return text ? [text] : [];
}

function createQuestionSelection() {
  return {
    questionKey: null,
    questionText: 'No question selected',
    answerType: null,
    sourceSurveyId: null,
    availableSurveyIds: [],
    surveyIds: []
  };
}

function createQuestionBlock(type = BLOCK_TYPES.QUESTION) {
  return {
    id: buildId('block'),
    type,
    questionA: createQuestionSelection(),
    questionB: type === BLOCK_TYPES.COMPARISON ? createQuestionSelection() : null,
    startDate: null,
    endDate: null
  };
}

function SurveyChecklist({ surveyIds, selectedSurveyIds, surveyLookup, onToggle }) {
  return (
    <FormGroup
      sx={{
        maxHeight: 180,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        p: 1,
        borderRadius: 1
      }}
    >
      {surveyIds.map((surveyId) => {
        const survey = surveyLookup[surveyId];
        if (!survey) {
          return null;
        }

        return (
          <FormControlLabel
            key={surveyId}
            control={
              <Checkbox
                checked={selectedSurveyIds.includes(surveyId)}
                onChange={(event) => onToggle(surveyId, event.target.checked)}
              />
            }
            label={`${survey.name} (${survey.eventName || 'Unknown event'})`}
          />
        );
      })}
      {surveyIds.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          No matching surveys yet.
        </Typography>
      )}
    </FormGroup>
  );
}

function DateRangeFields({ startDate, endDate, onChange }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        label="Start date"
        type="date"
        value={startDate || ''}
        onChange={(event) => onChange({ startDate: event.target.value || null })}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
      <TextField
        label="End date"
        type="date"
        value={endDate || ''}
        onChange={(event) => onChange({ endDate: event.target.value || null })}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
    </Stack>
  );
}

export default function Analysis() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState([]);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectorState, setSelectorState] = useState({
    open: false,
    blockId: null,
    slot: 'A',
    questionFilter: 'all',
    title: 'Select a Question'
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchSurveyData() {
      setLoading(true);

      try {
        const [forms, events] = await Promise.all([
          window.api.forms.listWithEventNameAndResponseCount(),
          window.api.events.listWithSurveyCountsAndTags()
        ]);

        const eventLookup = Object.fromEntries(events.map((event) => [event.id, event]));

        const surveyRows = await Promise.all(
          forms.map(async (form) => {
            const [questionRows, submissionRows] = await Promise.all([
              window.api.questions.listByForm(form.id),
              window.api.submissions.listByForm(form.id)
            ]);

            const choicePairs = await Promise.all(
              questionRows.map(async (question) => {
                if (question.answerType !== 'choice') {
                  return [question.id, []];
                }

                const rows = await window.api.questions.listChoicesByQuestion(question.id);
                const values = rows
                  .map((row) => String(row.choiceText || '').trim())
                  .filter(Boolean);
                return [question.id, values];
              })
            );

            const responsePairs = await Promise.all(
              submissionRows.map(async (submission) => {
                const rows = await window.api.responses.listBySubmission(submission.id);
                return [submission.id, rows];
              })
            );

            const choicesByQuestion = Object.fromEntries(choicePairs);
            const responsesBySubmission = Object.fromEntries(responsePairs);

            const questions = questionRows.map((question) => ({
              ...question,
              key: buildQuestionKey(question.text, question.answerType),
              choices: choicesByQuestion[question.id] || []
            }));

            const responsesByQuestionId = {};
            questions.forEach((question) => {
              responsesByQuestionId[question.id] = [];
            });

            submissionRows.forEach((submission) => {
              const submittedAtMs = toDateMs(submission.submittedAt);
              const submissionResponses = responsesBySubmission[submission.id] || [];

              submissionResponses.forEach((response) => {
                if (!responsesByQuestionId[response.questionId]) {
                  responsesByQuestionId[response.questionId] = [];
                }

                responsesByQuestionId[response.questionId].push({
                  surveyId: form.id,
                  submissionId: submission.id,
                  externalId: submission.externalId,
                  submittedAtMs,
                  response
                });
              });
            });

            const event = eventLookup[form.eventId];

            return {
              id: form.id,
              name: form.name,
              eventId: form.eventId,
              eventName: form.eventName || event?.name || 'Unknown event',
              eventTags: event?.tags || [],
              questions,
              questionByKey: Object.fromEntries(
                questions.map((question) => [question.key, question])
              ),
              responsesByQuestionId
            };
          })
        );

        if (!cancelled) {
          setSurveys(surveyRows);
        }
      } catch (fetchError) {
        console.error('Failed to load analysis data', fetchError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSurveyData();

    return () => {
      cancelled = true;
    };
  }, []);

  const surveyLookup = useMemo(
    () => Object.fromEntries(surveys.map((survey) => [survey.id, survey])),
    [surveys]
  );

  const matchingSurveyIdsByQuestionKey = useMemo(() => {
    const map = {};

    surveys.forEach((survey) => {
      survey.questions.forEach((question) => {
        if (!map[question.key]) {
          map[question.key] = new Set();
        }
        map[question.key].add(survey.id);
      });
    });

    return Object.fromEntries(
      Object.entries(map).map(([key, value]) => [key, [...value].sort((a, b) => a - b)])
    );
  }, [surveys]);

  const collectQuestionRows = (selection, range = {}) => {
    if (!selection.questionKey || !selection.answerType) {
      return [];
    }

    const rows = [];
    selection.surveyIds.forEach((surveyId) => {
      const survey = surveyLookup[surveyId];
      if (!survey) {
        return;
      }

      const question = survey.questionByKey[selection.questionKey];
      if (!question) {
        return;
      }

      const responseRows = survey.responsesByQuestionId[question.id] || [];
      responseRows.forEach((item) => {
        if (!matchesRange(item.submittedAtMs, range.startDate, range.endDate)) {
          return;
        }

        const parsedValues = parseResponseValues(item.response, selection.answerType);
        if (!parsedValues.length) {
          return;
        }

        rows.push({
          surveyId,
          responderKey: item.externalId || `${surveyId}-${item.submissionId}`,
          submittedAtMs: item.submittedAtMs,
          values: parsedValues
        });
      });
    });

    return rows;
  };

  const computeDateRangeDefaults = (selections) => {
    const allRows = selections.flatMap((selection) => collectQuestionRows(selection));
    if (!allRows.length) {
      return { startDate: null, endDate: null };
    }

    const submittedAtValues = allRows
      .map((row) => row.submittedAtMs)
      .filter((value) => Number.isFinite(value));

    if (!submittedAtValues.length) {
      return { startDate: null, endDate: null };
    }

    return {
      startDate: toDateInputValue(Math.min(...submittedAtValues)),
      endDate: toDateInputValue(Math.max(...submittedAtValues))
    };
  };

  const collectChoiceLabels = (selection, rows) => {
    const labels = new Set();

    selection.availableSurveyIds.forEach((surveyId) => {
      const survey = surveyLookup[surveyId];
      const question = survey?.questionByKey[selection.questionKey];
      (question?.choices || []).forEach((choice) => labels.add(choice));
    });

    rows.forEach((row) => {
      row.values.forEach((value) => {
        labels.add(String(value));
      });
    });

    return [...labels];
  };

  const buildQuestionChartData = (block) => {
    const selection = block.questionA;
    if (!selection.questionKey) {
      return { type: 'empty', totalResponses: 0 };
    }

    const rows = collectQuestionRows(selection, {
      startDate: block.startDate,
      endDate: block.endDate
    });

    if (!rows.length) {
      return { type: 'empty', totalResponses: 0 };
    }

    if (block.type === BLOCK_TYPES.WORD_CLOUD || selection.answerType === 'text') {
      const textValues = rows.flatMap((row) => row.values.map((value) => String(value)));
      return { type: 'text', totalResponses: textValues.length, textValues };
    }

    if (selection.answerType === 'number') {
      const values = rows.flatMap((row) => row.values).filter((value) => Number.isFinite(value));
      return { type: 'number', totalResponses: values.length, values };
    }

    const counts = new Map();
    rows.forEach((row) => {
      row.values.forEach((value) => {
        const label = String(value);
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });

    const labels = collectChoiceLabels(selection, rows);
    labels.forEach((label) => {
      if (!counts.has(label)) {
        counts.set(label, 0);
      }
    });

    const data = [...counts.entries()].map(([label, count]) => ({ label, count }));
    return {
      type: 'choice',
      totalResponses: data.reduce((sum, item) => sum + item.count, 0),
      data
    };
  };

  const buildComparisonChartData = (block) => {
    const selectionA = block.questionA;
    const selectionB = block.questionB;

    if (!selectionA?.questionKey || !selectionB?.questionKey) {
      return { type: 'empty' };
    }

    if (selectionA.answerType === 'text' || selectionB.answerType === 'text') {
      return {
        type: 'invalid',
        message: 'Text-response questions cannot be used in comparison charts.'
      };
    }

    const rowsA = collectQuestionRows(selectionA, {
      startDate: block.startDate,
      endDate: block.endDate
    });
    const rowsB = collectQuestionRows(selectionB, {
      startDate: block.startDate,
      endDate: block.endDate
    });

    const mapA = new Map();
    rowsA.forEach((row) => {
      if (!mapA.has(row.responderKey)) {
        mapA.set(row.responderKey, []);
      }
      mapA.get(row.responderKey).push(...row.values);
    });

    const mapB = new Map();
    rowsB.forEach((row) => {
      if (!mapB.has(row.responderKey)) {
        mapB.set(row.responderKey, []);
      }
      mapB.get(row.responderKey).push(...row.values);
    });

    const overlappingKeys = [...mapA.keys()].filter((key) => mapB.has(key));
    if (!overlappingKeys.length) {
      return { type: 'empty' };
    }

    const aIsChoice = selectionA.answerType === 'choice';
    const bIsChoice = selectionB.answerType === 'choice';
    const aIsNumber = selectionA.answerType === 'number';
    const bIsNumber = selectionB.answerType === 'number';

    if (aIsChoice && bIsChoice) {
      const rowLabels = collectChoiceLabels(selectionA, rowsA);
      const columnLabels = collectChoiceLabels(selectionB, rowsB);
      const pointMap = new Map();

      overlappingKeys.forEach((key) => {
        const aValues = mapA.get(key).map(String);
        const bValues = mapB.get(key).map(String);

        aValues.forEach((aValue) => {
          bValues.forEach((bValue) => {
            const cellKey = `${aValue}::${bValue}`;
            pointMap.set(cellKey, (pointMap.get(cellKey) || 0) + 1);
          });
        });
      });

      const points = [];
      rowLabels.forEach((rowLabel) => {
        columnLabels.forEach((columnLabel) => {
          const key = `${rowLabel}::${columnLabel}`;
          points.push({ rowLabel, columnLabel, count: pointMap.get(key) || 0 });
        });
      });

      return {
        type: 'heatmap',
        rowLabels,
        columnLabels,
        points,
        respondents: overlappingKeys.length
      };
    }

    if (aIsNumber && bIsNumber) {
      const points = overlappingKeys
        .map((key) => {
          const x = Number(mapA.get(key)[0]);
          const y = Number(mapB.get(key)[0]);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
          }
          return { x, y };
        })
        .filter(Boolean);

      return { type: 'scatter', points, respondents: points.length };
    }

    const numericSelection = aIsNumber ? selectionA : selectionB;
    const choiceSelection = aIsChoice ? selectionA : selectionB;
    const numericMap = aIsNumber ? mapA : mapB;
    const choiceMap = aIsChoice ? mapA : mapB;

    const stackedValues = [];
    overlappingKeys.forEach((key) => {
      const numericValue = Number(numericMap.get(key)[0]);
      const categories = choiceMap.get(key).map(String);

      if (!Number.isFinite(numericValue) || !categories.length) {
        return;
      }

      categories.forEach((category) => {
        stackedValues.push({ value: numericValue, series: category });
      });
    });

    const categories = collectChoiceLabels(choiceSelection, aIsChoice ? rowsA : rowsB);

    return {
      type: 'stacked_histogram',
      values: stackedValues,
      seriesByValue: categories,
      respondents: overlappingKeys.length,
      numericAxisLabel: numericSelection.questionText
    };
  };

  const updateBlock = (blockId, updater) => {
    setBlocks((previousBlocks) =>
      previousBlocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        return typeof updater === 'function' ? updater(block) : { ...block, ...updater };
      })
    );
  };

  const openSelector = ({ blockId, slot = 'A', allowText = true, title = 'Select a Question' }) => {
    const questionFilter = allowText === 'text_only' ? 'text_only' : allowText ? 'all' : 'non_text';
    setSelectorState({ open: true, blockId, slot, questionFilter, title });
  };

  const closeSelector = () => {
    setSelectorState((previous) => ({ ...previous, open: false }));
  };

  const applyQuestionSelection = (surveyId, question) => {
    const targetBlock = blocks.find((block) => block.id === selectorState.blockId);
    if (!targetBlock) {
      closeSelector();
      return;
    }

    const matchingSurveyIds = matchingSurveyIdsByQuestionKey[question.key] || [];
    if (targetBlock.type === BLOCK_TYPES.WORD_CLOUD && question.answerType !== 'text') {
      return;
    }

    const nextSelection = {
      questionKey: question.key,
      questionText: question.text,
      answerType: question.answerType,
      sourceSurveyId: surveyId,
      availableSurveyIds: matchingSurveyIds,
      surveyIds: [...matchingSurveyIds]
    };

    updateBlock(targetBlock.id, (block) => {
      const nextBlock = {
        ...block,
        questionA: selectorState.slot === 'A' ? nextSelection : block.questionA,
        questionB: selectorState.slot === 'B' ? nextSelection : block.questionB
      };

      const defaults = computeDateRangeDefaults(
        [nextBlock.questionA, nextBlock.questionB].filter(Boolean)
      );

      return {
        ...nextBlock,
        startDate: defaults.startDate,
        endDate: defaults.endDate
      };
    });

    closeSelector();
  };

  const toggleSurvey = (blockId, slot, surveyId, checked) => {
    updateBlock(blockId, (block) => {
      const target = slot === 'A' ? block.questionA : block.questionB;
      if (!target) {
        return block;
      }

      const nextSurveyIds = checked
        ? [...new Set([...target.surveyIds, surveyId])]
        : target.surveyIds.filter((id) => id !== surveyId);

      return {
        ...block,
        questionA: slot === 'A' ? { ...target, surveyIds: nextSurveyIds } : block.questionA,
        questionB: slot === 'B' ? { ...target, surveyIds: nextSurveyIds } : block.questionB
      };
    });
  };

  const renderQuestionChart = (block) => {
    const chartData = buildQuestionChartData(block);

    if (chartData.type === 'empty') {
      return <EmptyChart />;
    }

    if (chartData.type === 'number') {
      return <NumericHistogramChart values={chartData.values} />;
    }

    if (chartData.type === 'text') {
      return <WordCloudChart textValues={chartData.textValues} />;
    }

    return <ChoiceBarChart data={chartData.data} />;
  };

  const renderComparisonChart = (block) => {
    const comparisonData = buildComparisonChartData(block);

    if (comparisonData.type === 'invalid') {
      return <EmptyChart />;
    }

    if (comparisonData.type === 'empty') {
      return <EmptyChart />;
    }

    if (comparisonData.type === 'heatmap') {
      return (
        <HeatMapChart
          rowLabels={comparisonData.rowLabels}
          columnLabels={comparisonData.columnLabels}
          points={comparisonData.points}
        />
      );
    }

    if (comparisonData.type === 'scatter') {
      return <ScatterComparisonChart points={comparisonData.points} />;
    }

    return <StackedHistogramChart values={comparisonData.values} />;
  };

  const renderSingleQuestionBlock = (block) => {
    const forcedWordCloud = block.type === BLOCK_TYPES.WORD_CLOUD;
    const descriptor = forcedWordCloud ? 'Word cloud' : 'Question chart';

    return (
      <Card key={block.id}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="h6">{descriptor}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {block.questionA.questionText}
                </Typography>
              </Stack>
              <Button
                color="error"
                onClick={() => setBlocks((prev) => prev.filter((item) => item.id !== block.id))}
              >
                Remove
              </Button>
            </Stack>

            <Button
              variant="outlined"
              onClick={() =>
                openSelector({
                  blockId: block.id,
                  slot: 'A',
                  allowText: forcedWordCloud ? 'text_only' : true,
                  title: 'Select a Question'
                })
              }
              sx={{ alignSelf: 'start' }}
            >
              Select question
            </Button>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Included surveys</Typography>
              <SurveyChecklist
                surveyIds={block.questionA.availableSurveyIds}
                selectedSurveyIds={block.questionA.surveyIds}
                surveyLookup={surveyLookup}
                onToggle={(surveyId, checked) => toggleSurvey(block.id, 'A', surveyId, checked)}
              />
            </Stack>

            <DateRangeFields
              startDate={block.startDate}
              endDate={block.endDate}
              onChange={(changes) => updateBlock(block.id, changes)}
            />

            {renderQuestionChart(block)}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const renderComparisonBlock = (block) => {
    return (
      <Card key={block.id}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="h6">Comparison chart</Typography>
              <Button
                color="error"
                onClick={() => setBlocks((prev) => prev.filter((item) => item.id !== block.id))}
              >
                Remove
              </Button>
            </Stack>

            {[
              {
                slot: 'A',
                selection: block.questionA,
                label: 'First question'
              },
              {
                slot: 'B',
                selection: block.questionB,
                label: 'Second question'
              }
            ].map((item) => (
              <Fragment key={`${block.id}-${item.slot}`}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{item.label}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {item.selection.questionText}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      openSelector({
                        blockId: block.id,
                        slot: item.slot,
                        allowText: false,
                        title: 'Select a Question'
                      })
                    }
                    sx={{ alignSelf: 'start' }}
                  >
                    Select question
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="subtitle2">
                    Included surveys for {item.label.toLowerCase()}
                  </Typography>
                  <SurveyChecklist
                    surveyIds={item.selection.availableSurveyIds}
                    selectedSurveyIds={item.selection.surveyIds}
                    surveyLookup={surveyLookup}
                    onToggle={(surveyId, checked) =>
                      toggleSurvey(block.id, item.slot, surveyId, checked)
                    }
                  />
                </Stack>
              </Fragment>
            ))}

            <DateRangeFields
              startDate={block.startDate}
              endDate={block.endDate}
              onChange={(changes) => updateBlock(block.id, changes)}
            />

            {renderComparisonChart(block)}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, minHeight: '100%' }}>
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ width: '100%' }}
        >
          <Box />
          <Button
            variant="contained"
            endIcon={<ArrowDropDown />}
            startIcon={<Add />}
            disabled={loading}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            Add Chart
          </Button>
        </Stack>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setBlocks((previous) => [...previous, createQuestionBlock(BLOCK_TYPES.QUESTION)]);
              setMenuAnchor(null);
            }}
          >
            Add question chart...
          </MenuItem>
          <MenuItem
            onClick={() => {
              setBlocks((previous) => [...previous, createQuestionBlock(BLOCK_TYPES.COMPARISON)]);
              setMenuAnchor(null);
            }}
          >
            Add comparison chart...
          </MenuItem>
          <MenuItem
            onClick={() => {
              setBlocks((previous) => [...previous, createQuestionBlock(BLOCK_TYPES.WORD_CLOUD)]);
              setMenuAnchor(null);
            }}
          >
            Add word cloud...
          </MenuItem>
        </Menu>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: 2
          }}
        >
          {blocks.map((block) =>
            block.type === BLOCK_TYPES.COMPARISON
              ? renderComparisonBlock(block)
              : renderSingleQuestionBlock(block)
          )}
        </Box>
      </Stack>

      <QuestionSelectorDialog
        open={selectorState.open}
        surveys={surveys}
        questionFilter={selectorState.questionFilter}
        title={selectorState.title}
        onClose={closeSelector}
        onSelectQuestion={applyQuestionSelection}
      />
    </Box>
  );
}
