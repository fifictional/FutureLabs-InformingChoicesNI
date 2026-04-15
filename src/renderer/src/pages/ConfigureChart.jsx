/* eslint-disable react/prop-types */

import { ArrowBack, Save } from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Backdrop,
  CircularProgress,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router';
import ContainerWithBackground from '../components/common/ContainerWithBackground';
import {
  ChoiceBarChart,
  EmptyChart,
  GeoChart,
  HeatMapChart,
  NumericHistogramChart,
  ResponseTrendChart,
  ScatterComparisonChart,
  StackedHistogramChart,
  WordCloudChart
} from '../components/analysis/AnalysisCharts.jsx';
import {
  buildResponseTrendSeries,
  createResponseTrendSettings,
  getResponseTrendRangeOptions,
  normalizeResponseTrendSettings,
  RESPONSE_TREND_INTERVAL_OPTIONS
} from '../common/chartTrendUtils.js';
import {
  buildGeoSeries,
  clampSelectionSurveyIds,
  createGeoSettings,
  GEO_CHART_MODES,
  normalizeGeoSettings,
  selectionCoversSurveyIds
} from '../common/geoUtils.js';
import QuestionSelectorDialog from '../components/analysis/QuestionSelectorDialog.jsx';
import { fetchAllPages } from '../common/pagination';

// Import utility functions from Analysis.jsx
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

    const rawText = String(response?.valueText ?? '').trim();
    if (!rawText) {
      return [];
    }

    const textNumber = Number(rawText);
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

function SurveySelectionGrid({
  surveyIds,
  selectedSurveyIds,
  surveyLookup,
  onSelectionChange,
  disabled = false
}) {
  const [eventFilters, setEventFilters] = useState([]);
  const [tagFilters, setTagFilters] = useState([]);

  const surveys = useMemo(
    () =>
      surveyIds
        .map((surveyId) => surveyLookup[surveyId])
        .filter(Boolean)
        .map((survey) => ({
          ...survey,
          normalizedTags: (survey.eventTags || []).map((tag) => String(tag).trim()).filter(Boolean)
        })),
    [surveyIds, surveyLookup]
  );

  const eventOptions = useMemo(() => {
    return [...new Set(surveys.map((survey) => survey.eventName || 'Unknown event'))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [surveys]);

  const tagOptions = useMemo(() => {
    return [...new Set(surveys.flatMap((survey) => survey.normalizedTags))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [surveys]);

  useEffect(() => {
    setEventFilters((previous) => previous.filter((eventName) => eventOptions.includes(eventName)));
  }, [eventOptions]);

  useEffect(() => {
    setTagFilters((previous) => previous.filter((tag) => tagOptions.includes(tag)));
  }, [tagOptions]);

  const filteredRows = useMemo(() => {
    const visible = surveys.filter((survey) => {
      const eventName = survey.eventName || 'Unknown event';

      if (eventFilters.length > 0 && !eventFilters.includes(eventName)) {
        return false;
      }

      if (tagFilters.length > 0 && !tagFilters.some((tag) => survey.normalizedTags.includes(tag))) {
        return false;
      }

      return true;
    });

    return visible
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((survey) => ({
      id: survey.id,
      surveyName: survey.name,
      eventName: survey.eventName || 'Unknown event',
      eventTags: survey.normalizedTags,
      eventTagsText: survey.normalizedTags.join(', ')
    }));
  }, [eventFilters, surveys, tagFilters]);

  const filteredRowIds = useMemo(() => new Set(filteredRows.map((row) => row.id)), [filteredRows]);

  const selectedVisibleIds = useMemo(
    () => selectedSurveyIds.filter((id) => filteredRowIds.has(id)),
    [filteredRowIds, selectedSurveyIds]
  );

  const selectedHiddenIds = useMemo(
    () => selectedSurveyIds.filter((id) => surveyIds.includes(id) && !filteredRowIds.has(id)),
    [filteredRowIds, selectedSurveyIds, surveyIds]
  );

  const selectionModel = useMemo(
    () => ({
      type: 'include',
      ids: new Set(selectedVisibleIds)
    }),
    [selectedVisibleIds]
  );

  const columns = useMemo(
    () => [
      { field: 'surveyName', headerName: 'Survey', flex: 1.2, minWidth: 180 },
      { field: 'eventName', headerName: 'Event', flex: 1, minWidth: 160 },
      { field: 'eventTagsText', headerName: 'Event tags', flex: 1.4, minWidth: 220 }
    ],
    []
  );

  const handleSelectAllByEvents = () => {
    if (!eventFilters.length) {
      return;
    }

    const matchingIds = surveys
      .filter((survey) => eventFilters.includes(survey.eventName || 'Unknown event'))
      .map((survey) => survey.id);

    onSelectionChange([...new Set([...selectedSurveyIds, ...matchingIds])]);
  };

  const handleSelectAllByTags = () => {
    if (!tagFilters.length) {
      return;
    }

    const matchingIds = surveys
      .filter((survey) => tagFilters.some((tag) => survey.normalizedTags.includes(tag)))
      .map((survey) => survey.id);

    onSelectionChange([...new Set([...selectedSurveyIds, ...matchingIds])]);
  };

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <Autocomplete
          multiple
          size="small"
          options={eventOptions}
          value={eventFilters}
          onChange={(_event, nextValue) => setEventFilters(nextValue)}
          disableCloseOnSelect
          renderInput={(params) => <TextField {...params} label="Events" />}
          sx={{ flex: 1 }}
        />
        <Autocomplete
          multiple
          size="small"
          options={tagOptions}
          value={tagFilters}
          onChange={(_event, nextValue) => setTagFilters(nextValue)}
          disableCloseOnSelect
          renderInput={(params) => <TextField {...params} label="Event tags" />}
          sx={{ flex: 1 }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          onClick={handleSelectAllByEvents}
          disabled={disabled || eventFilters.length === 0}
        >
          Select All by Event
        </Button>
        <Button
          variant="outlined"
          onClick={handleSelectAllByTags}
          disabled={disabled || tagFilters.length === 0}
        >
          Select All by Tag
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Showing {filteredRows.length} of {surveyIds.length} surveys. Selected: {selectedSurveyIds.length}
      </Typography>

      <Box
        sx={{
          height: 520,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <DataGrid
          rows={filteredRows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          pagination
          pageSizeOptions={[10]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(nextSelection) => {
            const nextIds = Array.isArray(nextSelection)
              ? nextSelection
              : [...(nextSelection?.ids || [])];
            const normalizedVisibleIds = nextIds
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id));
            onSelectionChange([...new Set([...selectedHiddenIds, ...normalizedVisibleIds])]);
          }}
          disableColumnMenu
          loading={disabled}
          sx={{
            border: 'none',
            opacity: disabled ? 0.7 : 1
          }}
        />
      </Box>
    </Stack>
  );
}

function DateRangeFields({ startDate, endDate, onChange, disabled = false }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        label="Start date"
        type="date"
        value={startDate || ''}
        onChange={(event) => onChange({ startDate: event.target.value || null })}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
        disabled={disabled}
      />
      <TextField
        label="End date"
        type="date"
        value={endDate || ''}
        onChange={(event) => onChange({ endDate: event.target.value || null })}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
        disabled={disabled}
      />
    </Stack>
  );
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

function collectChoiceOptionsForSelection(selection, surveyLookup) {
  if (!selection?.questionKey) {
    return [];
  }

  const labels = new Set();
  (selection.availableSurveyIds || []).forEach((surveyId) => {
    const survey = surveyLookup[surveyId];
    const question = survey?.questionByKey?.[selection.questionKey];
    (question?.choices || []).forEach((choice) => labels.add(String(choice)));
  });

  return [...labels].sort((a, b) => a.localeCompare(b));
}

function TextResponsesList({ textValues }) {
  const [search, setSearch] = useState('');

  const countMap = {};
  textValues.forEach((v) => {
    const key = String(v).trim();
    if (key) countMap[key] = (countMap[key] || 0) + 1;
  });
  const total = textValues.length;
  const items = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .filter(([text]) => !search || text.toLowerCase().includes(search.toLowerCase()));

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        placeholder="Search responses…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Box
        sx={{
          maxHeight: 300,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        {items.length > 0 ? (
          items.map(([text, count]) => (
            <Box
              key={text}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 1.5,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' }
              }}
            >
              <Typography variant="body2" sx={{ flex: 1, mr: 2 }}>{text}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {count} ({Math.round((count / total) * 100)}%)
              </Typography>
            </Box>
          ))
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">No matching responses.</Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
}

function QuestionConfigurationSection({
  title,
  selection,
  onSelect,
  surveyLookup,
  onSurveySelectionChange,
  disabled = false
}) {
  const surveyCount = selection?.availableSurveyIds?.length || 0;

  return (
    <Stack spacing={2.5}>
      <Typography variant="subtitle2">{title}</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Stack flex={1}>
          <Typography variant="body2" color="text.secondary">
            Question
          </Typography>
          <Typography variant="body1">
            {selection?.questionText || 'No question selected'}
          </Typography>
        </Stack>
        <Stack flex={1}>
          <Typography variant="body2" color="text.secondary">
            Surveys Found
          </Typography>
          <Typography variant="body1">{surveyCount}</Typography>
        </Stack>
      </Stack>

      <Button
        variant="outlined"
        onClick={onSelect}
        sx={{ alignSelf: 'start' }}
        disabled={disabled}
      >
        {selection?.questionKey ? 'Change Question' : 'Select Question'}
      </Button>

      <Stack spacing={1}>
        <Typography variant="subtitle2">Included Surveys</Typography>
        <SurveySelectionGrid
          surveyIds={selection?.availableSurveyIds || []}
          selectedSurveyIds={selection?.surveyIds || []}
          surveyLookup={surveyLookup}
          onSelectionChange={onSurveySelectionChange}
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
}

function ResponseTrendSettingsSection({
  questionSelection,
  surveyLookup,
  trendSettings,
  onTrendChange,
  disabled = false
}) {
  const choiceOptions = useMemo(
    () => collectChoiceOptionsForSelection(questionSelection, surveyLookup),
    [questionSelection, surveyLookup]
  );

  const rangeOptions = useMemo(
    () => getResponseTrendRangeOptions(trendSettings.interval),
    [trendSettings.interval]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Trend Settings</Typography>

      {questionSelection?.answerType === 'choice' && (
        <TextField
          select
          size="small"
          label="Answer"
          value={trendSettings.selectedChoice || ''}
          onChange={(event) => onTrendChange({ selectedChoice: event.target.value })}
          disabled={disabled || choiceOptions.length === 0}
          helperText="Track how often this answer appears over time."
        >
          {choiceOptions.map((choice) => (
            <MenuItem key={choice} value={choice}>
              {choice}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          size="small"
          label="Interval"
          value={trendSettings.interval}
          onChange={(event) => onTrendChange({ interval: event.target.value })}
          fullWidth
          disabled={disabled}
          helperText="Choose how each point on the line should be grouped."
        >
          {RESPONSE_TREND_INTERVAL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Range"
          value={trendSettings.rangePreset}
          onChange={(event) => onTrendChange({ rangePreset: event.target.value })}
          fullWidth
          disabled={disabled}
          helperText="Only sensible ranges are shown for the selected interval."
        >
          {rangeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Mode"
          value={trendSettings.cumulative ? 'cumulative' : 'period'}
          onChange={(event) => onTrendChange({ cumulative: event.target.value === 'cumulative' })}
          fullWidth
          disabled={disabled}
          helperText="Show each period on its own or a running cumulative series."
        >
          <MenuItem value="period">Per interval</MenuItem>
          <MenuItem value="cumulative">Cumulative</MenuItem>
        </TextField>
      </Stack>

      {questionSelection?.answerType === 'number' && (
        <Typography variant="caption" color="text.secondary">
          Numeric trends plot the average response per time bucket. Hover points in the chart to see count, mean, median, and range.
        </Typography>
      )}
    </Stack>
  );
}

function GeoSettingsSection({
  questionSelection,
  geoSettings,
  onGeoChange,
  disabled = false
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Geographical Settings</Typography>

      <TextField
        select
        size="small"
        label="Mode"
        value={geoSettings.mode}
        onChange={(event) => onGeoChange({ mode: event.target.value })}
        fullWidth
        disabled={disabled}
        helperText="Show all responses as locations or track a specific answer."
      >
        {GEO_CHART_MODES.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <Typography variant="caption" color="text.secondary">
        Geographic data is matched against location names (e.g., Belfast, Derry). Response values are treated as location names and mapped to their coordinates.
      </Typography>
    </Stack>
  );
}

function GeoAnswerSelectorSection({
  filterSelection,
  surveyLookup,
  geoSettings,
  onGeoChange,
  disabled = false
}) {
  const filterChoiceOptions = useMemo(
    () => collectChoiceOptionsForSelection(filterSelection, surveyLookup),
    [filterSelection, surveyLookup]
  );

  if (!filterSelection?.questionKey) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">Select Answer to Filter By</Typography>
        <Typography variant="caption" color="text.secondary">
          Select a filter question above to choose which answer to track on the map.
        </Typography>
      </Stack>
    );
  }

  if (filterSelection?.answerType !== 'choice') {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">Filter Question Type Issue</Typography>
        <Typography variant="caption" color="text.secondary">
          The filter question must be a choice question so you can select a specific answer to track on the map.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Select Answer to Filter By</Typography>
      <TextField
        select
        size="small"
        label="Answer"
        value={geoSettings.selectedChoice || ''}
        onChange={(event) => onGeoChange({ selectedChoice: event.target.value })}
        disabled={disabled || filterChoiceOptions.length === 0}
        helperText="Only responses matching this answer are shown on the map."
        fullWidth
      >
        {filterChoiceOptions.map((choice) => (
          <MenuItem key={choice} value={choice}>
            {choice}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

export default function ConfigureChart() {
  const navigate = useNavigate();
  const { chartId } = useParams();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [chartName, setChartName] = useState('');
  const [chartType, setChartType] = useState('question');
  const [block, setBlock] = useState({
    type: 'question',
    questionA: createQuestionSelection(),
    questionB: null,
    trend: createResponseTrendSettings(),
    geo: createGeoSettings(),
    startDate: null,
    endDate: null
  });

  const [selectorState, setSelectorState] = useState({
    open: false,
    slot: 'A',
    questionFilter: 'all',
    title: 'Select a Question'
  });

  const [heatmapDrilldown, setHeatmapDrilldown] = useState(null);
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

  // Load survey data and chart data if editing
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const [forms, events] = await Promise.all([
          fetchAllPages((offset, limit) =>
            window.api.forms.listWithEventNameAndResponseCount(offset, limit)
          ),
          window.api.events.listWithSurveyCountsAndTags()
        ]);

        const eventLookup = Object.fromEntries(events.map((event) => [event.id, event]));

        const surveyRows = await Promise.all(
          forms.map(async (form) => {
            const [questionRows, submissionRows] = await Promise.all([
              fetchAllPages((offset, limit) =>
                window.api.questions.listByForm(form.id, offset, limit)
              ),
              fetchAllPages((offset, limit) =>
                window.api.submissions.listByForm(form.id, offset, limit)
              )
            ]);

            const choicePairs = await Promise.all(
              questionRows.map(async (question) => {
                if (question.answerType !== 'choice') {
                  return [question.id, []];
                }

                const rows = await fetchAllPages((offset, limit) =>
                  window.api.questions.listChoicesByQuestion(question.id, offset, limit)
                );
                const values = rows
                  .map((row) => String(row.choiceText || '').trim())
                  .filter(Boolean);
                return [question.id, values];
              })
            );

            const responsePairs = await Promise.all(
              submissionRows.map(async (submission) => {
                const rows = await fetchAllPages((offset, limit) =>
                  window.api.responses.listBySubmission(submission.id, offset, limit)
                );
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

          // Load chart data if editing
          if (chartId) {
            try {
              const chart = await window.api.charts.findById(parseInt(chartId, 10));
              if (chart && !cancelled) {
                const config = JSON.parse(chart.configuration);
                setChartName(chart.name);
                setChartType(chart.chartType);
                setBlock({
                  type: chart.chartType,
                  questionA: config.questionA || createQuestionSelection(),
                  questionB: config.questionB || null,
                  trend: normalizeResponseTrendSettings(config.trend),
                  geo: normalizeGeoSettings(config.geo),
                  startDate: config.startDate || null,
                  endDate: config.endDate || null
                });
              }
            } catch (chartError) {
              console.error('Failed to load chart data', chartError);
            }
          }
        }
      } catch (fetchError) {
        console.error('Failed to load survey data', fetchError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [chartId]);

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

  const trendSettings = useMemo(
    () => normalizeResponseTrendSettings(block.trend),
    [block.trend]
  );

  const geoSettings = useMemo(
    () => normalizeGeoSettings(block.geo),
    [block.geo]
  );

  const questionAChoiceOptions = useMemo(
    () => collectChoiceOptionsForSelection(block.questionA, surveyLookup),
    [block.questionA, surveyLookup]
  );

  const questionBChoiceOptions = useMemo(
    () => collectChoiceOptionsForSelection(block.questionB, surveyLookup),
    [block.questionB, surveyLookup]
  );

  useEffect(() => {
    if (chartType !== 'response_trend') {
      return;
    }

    if (block.questionA?.answerType === 'choice') {
      if (!questionAChoiceOptions.length) {
        return;
      }

      if (!questionAChoiceOptions.includes(trendSettings.selectedChoice)) {
        setBlock((previous) => ({
          ...previous,
          trend: {
            ...normalizeResponseTrendSettings(previous.trend),
            selectedChoice: questionAChoiceOptions[0]
          }
        }));
      }

      return;
    }

    if (trendSettings.selectedChoice) {
      setBlock((previous) => ({
        ...previous,
        trend: {
          ...normalizeResponseTrendSettings(previous.trend),
          selectedChoice: ''
        }
      }));
    }
  }, [block.questionA?.answerType, chartType, questionAChoiceOptions, trendSettings.selectedChoice]);

  useEffect(() => {
    if (chartType !== 'geo') {
      return;
    }

    if (geoSettings.mode === 'per_answer') {
      if (!block.questionB) {
        setBlock((previous) => ({
          ...previous,
          questionB: createQuestionSelection(),
          geo: {
            ...normalizeGeoSettings(previous.geo),
            selectedChoice: ''
          }
        }));
        return;
      }

      if (block.questionB.answerType !== 'choice') {
        if (!geoSettings.selectedChoice) {
          return;
        }

        setBlock((previous) => ({
          ...previous,
          geo: {
            ...normalizeGeoSettings(previous.geo),
            selectedChoice: ''
          }
        }));
        return;
      }

      // Keep filter question survey selection aligned to selected location surveys.
      const clampedQuestionB = clampSelectionSurveyIds(block.questionB, block.questionA.surveyIds || []);
      const surveysChanged =
        JSON.stringify(clampedQuestionB.surveyIds || []) !== JSON.stringify(block.questionB.surveyIds || []);
      if (surveysChanged) {
        setBlock((previous) => ({
          ...previous,
          questionB: clampSelectionSurveyIds(previous.questionB, previous.questionA.surveyIds || [])
        }));
        return;
      }

      if (!questionBChoiceOptions.length) {
        return;
      }

      if (!questionBChoiceOptions.includes(geoSettings.selectedChoice)) {
        setBlock((previous) => ({
          ...previous,
          geo: {
            ...normalizeGeoSettings(previous.geo),
            selectedChoice: questionBChoiceOptions[0]
          }
        }));
      }

      return;
    }

    if (geoSettings.selectedChoice) {
      setBlock((previous) => ({
        ...previous,
        geo: {
          ...normalizeGeoSettings(previous.geo),
          selectedChoice: ''
        }
      }));
    }
  }, [
    block.questionA?.surveyIds,
    block.questionB,
    chartType,
    geoSettings.mode,
    geoSettings.selectedChoice,
    questionBChoiceOptions
  ]);

  const buildQuestionChartData = () => {
    const selection = block.questionA;
    if (!selection.questionKey) {
      return { type: 'empty', totalResponses: 0 };
    }

    const rows = chartType === 'response_trend'
      ? collectQuestionRows(selection)
      : collectQuestionRows(selection, {
          startDate: block.startDate,
          endDate: block.endDate
        });

    if (!rows.length) {
      return { type: 'empty', totalResponses: 0 };
    }

    if (chartType === 'response_trend') {
      return buildResponseTrendSeries({
        rows,
        answerType: selection.answerType,
        selectedChoice: trendSettings.selectedChoice,
        interval: trendSettings.interval,
        rangePreset: trendSettings.rangePreset,
        cumulative: trendSettings.cumulative
      });
    }

    if (chartType === 'geo') {
      const locationRows = rows;

      if (geoSettings.mode === 'per_answer') {
        const filterSelection = block.questionB;
        if (!filterSelection?.questionKey) {
          return { type: 'needs_filter_question', totalResponses: 0 };
        }

        if (!selectionCoversSurveyIds(filterSelection, selection.surveyIds || [])) {
          return { type: 'needs_comparable_question', totalResponses: 0 };
        }

        if (!geoSettings.selectedChoice) {
          return { type: 'needs_answer', totalResponses: 0 };
        }

        const filterRows = collectQuestionRows({
          ...filterSelection,
          surveyIds: [...(selection.surveyIds || [])]
        }, {
          startDate: block.startDate,
          endDate: block.endDate
        });

        return buildGeoSeries({
          mode: geoSettings.mode,
          locationRows,
          filterRows,
          selectedChoice: geoSettings.selectedChoice
        });
      }

      return buildGeoSeries({
        mode: geoSettings.mode,
        locationRows
      });
    }

    if (chartType === 'word_cloud') {
      const textValues = rows.flatMap((row) => row.values.map((value) => String(value)));
      return { type: 'text', totalResponses: textValues.length, textValues };
    }

    if (selection.answerType === 'text') {
      const textValues = rows.flatMap((row) => row.values.map((value) => String(value)));
      return { type: 'text_list', totalResponses: textValues.length, textValues };
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

    const data = labels.map((label) => ({ label, count: counts.get(label) || 0 }));
    return {
      type: 'choice',
      totalResponses: data.reduce((sum, item) => sum + item.count, 0),
      data
    };
  };

  const buildComparisonChartData = () => {
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

  const updateBlock = (updater) => {
    setBlock(typeof updater === 'function' ? updater(block) : { ...block, ...updater });
  };

  const openSelector = ({ slot = 'A', allowText = true, title = 'Select a Question' }) => {
    const questionFilter = allowText === 'text_only' ? 'text_only' : allowText ? 'all' : 'non_text';
    setSelectorState({ open: true, slot, questionFilter, title });
  };

  const closeSelector = () => {
    setSelectorState((previous) => ({ ...previous, open: false }));
  };

  const applyQuestionSelection = (surveyId, question) => {
    const matchingSurveyIds = matchingSurveyIdsByQuestionKey[question.key] || [];
    if (block.type === 'word_cloud' && question.answerType !== 'text') {
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

    updateBlock((currentBlock) => {
      const nextBlock = {
        ...currentBlock,
        questionA: selectorState.slot === 'A' ? nextSelection : currentBlock.questionA,
        questionB: selectorState.slot === 'B' ? nextSelection : currentBlock.questionB,
        trend:
          selectorState.slot === 'A'
            ? {
                ...normalizeResponseTrendSettings(currentBlock.trend),
                selectedChoice: question.answerType === 'choice' ? String(question.choices?.[0] || '') : ''
              }
            : currentBlock.trend,
        geo:
          selectorState.slot === 'B'
            ? {
                ...normalizeGeoSettings(currentBlock.geo),
                selectedChoice: question.answerType === 'choice' ? String(question.choices?.[0] || '') : ''
              }
            : currentBlock.geo
      };
      return nextBlock;
    });

    closeSelector();
  };

  const toggleSurvey = (slot, surveyId, checked) => {
    updateBlock((currentBlock) => {
      const target = slot === 'A' ? currentBlock.questionA : currentBlock.questionB;
      if (!target) {
        return currentBlock;
      }

      const nextSurveyIds = checked
        ? [...new Set([...target.surveyIds, surveyId])]
        : target.surveyIds.filter((id) => id !== surveyId);

      return {
        ...currentBlock,
        questionA:
          slot === 'A' ? { ...target, surveyIds: nextSurveyIds } : currentBlock.questionA,
        questionB:
          slot === 'B' ? { ...target, surveyIds: nextSurveyIds } : currentBlock.questionB
      };
    });
  };

  const setSurveySelection = (slot, nextSurveyIds) => {
    updateBlock((currentBlock) => {
      const target = slot === 'A' ? currentBlock.questionA : currentBlock.questionB;
      if (!target) {
        return currentBlock;
      }

      const allowedIds = new Set(target.availableSurveyIds || []);
      const normalized = [...new Set(nextSurveyIds.filter((id) => allowedIds.has(id)))];

      return {
        ...currentBlock,
        questionA: slot === 'A' ? { ...target, surveyIds: normalized } : currentBlock.questionA,
        questionB: slot === 'B' ? { ...target, surveyIds: normalized } : currentBlock.questionB
      };
    });
  };

  const updateTrendSettings = (changes) => {
    setBlock((previous) => {
      const currentTrend = normalizeResponseTrendSettings(previous.trend);
      const nextInterval = changes.interval || currentTrend.interval;
      const availableRanges = getResponseTrendRangeOptions(nextInterval);
      const requestedRange = changes.rangePreset || currentTrend.rangePreset;
      const nextRangePreset = availableRanges.some((option) => option.value === requestedRange)
        ? requestedRange
        : availableRanges[availableRanges.length - 1].value;

      return {
        ...previous,
        trend: {
          ...currentTrend,
          ...changes,
          interval: nextInterval,
          rangePreset: nextRangePreset
        }
      };
    });
  };

  const updateGeoSettings = (changes) => {
    setBlock((previous) => {
      const nextGeo = {
        ...normalizeGeoSettings(previous.geo),
        ...changes
      };

      return {
        ...previous,
        questionB:
          nextGeo.mode === 'per_answer' ? previous.questionB || createQuestionSelection() : previous.questionB,
        geo: {
          ...nextGeo
        }
      };
    });
  };

  const renderQuestionChart = () => {
    const chartData = buildQuestionChartData();

    if (chartData.type === 'empty') {
      return <EmptyChart />;
    }

    if (chartData.type === 'number') {
      return <NumericHistogramChart values={chartData.values} />;
    }

    if (chartData.type === 'needs_choice') {
      return <EmptyChart message="Select an answer to plot its response trend." />;
    }

    if (chartData.type === 'needs_filter_question') {
      return <EmptyChart message="Select the filter question for By Answer mode." />;
    }

    if (chartData.type === 'needs_comparable_question') {
      return <EmptyChart message="Filter question must exist on all selected location surveys." />;
    }

    if (chartData.type === 'needs_answer') {
      return <EmptyChart message="Select an answer to filter map locations." />;
    }

    if (chartData.type === 'trend') {
      return <ResponseTrendChart points={chartData.points} metricLabel={chartData.metricLabel} />;
    }

    if (chartData.type === 'geo') {
      return <GeoChart locations={chartData.locations} />;
    }

    if (chartData.type === 'text') {
      return <WordCloudChart textValues={chartData.textValues} />;
    }

    if (chartData.type === 'text_list') {
      return <TextResponsesList textValues={chartData.textValues} />;
    }

    return <ChoiceBarChart data={chartData.data} />;
  };

  const renderComparisonChart = () => {
    const comparisonData = buildComparisonChartData();

    if (comparisonData.type === 'invalid') {
      return <EmptyChart />;
    }

    if (comparisonData.type === 'empty') {
      return <EmptyChart />;
    }

    if (comparisonData.type === 'heatmap') {
      if (heatmapDrilldown) {
        const isRow = heatmapDrilldown.axis === 'row';
        const barData = isRow
          ? comparisonData.columnLabels.map((col) => ({
              label: col,
              count:
                comparisonData.points.find(
                  (p) => p.rowLabel === heatmapDrilldown.label && p.columnLabel === col
                )?.count || 0
            }))
          : comparisonData.rowLabels.map((row) => ({
              label: row,
              count:
                comparisonData.points.find(
                  (p) => p.rowLabel === row && p.columnLabel === heatmapDrilldown.label
                )?.count || 0
            }));
        return (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setHeatmapDrilldown(null)}>
                ← Back to grid
              </Button>
              <Typography variant="body2" color="text.secondary">
                {isRow
                  ? `Row: "${heatmapDrilldown.label}"`
                  : `Column: "${heatmapDrilldown.label}"`}
              </Typography>
            </Stack>
            <ChoiceBarChart data={barData} />
          </Stack>
        );
      }
      return (
        <HeatMapChart
          rowLabels={comparisonData.rowLabels}
          columnLabels={comparisonData.columnLabels}
          points={comparisonData.points}
          onRowClick={(label) => setHeatmapDrilldown({ axis: 'row', label })}
          onColumnClick={(label) => setHeatmapDrilldown({ axis: 'col', label })}
        />
      );
    }

    if (comparisonData.type === 'scatter') {
      return <ScatterComparisonChart points={comparisonData.points} />;
    }

    return <StackedHistogramChart values={comparisonData.values} />;
  };

  const handleSave = async () => {
    if (!chartName.trim()) {
      setErrorMessage('Please enter a chart name');
      return;
    }

    try {
      const chartData = {
        name: chartName,
        chartType: chartType,
        configuration: block
      };

      if (chartId) {
        await window.api.charts.update(parseInt(chartId, 10), chartData);
      } else {
        await window.api.charts.create(chartData);
      }

      navigate('/analysis');
    } catch (error) {
      console.error('Failed to save chart', error);
      setErrorMessage('Failed to save chart. Please try again.');
    }
  };

  const handleChartTypeChange = (_, newType) => {
    if (!newType) return;
    setChartType(newType);
    setBlock((prev) => ({
      ...prev,
      type: newType,
      questionB: newType === 'comparison' || newType === 'geo' ? prev.questionB || createQuestionSelection() : null,
      trend: normalizeResponseTrendSettings(prev.trend),
      geo: normalizeGeoSettings(prev.geo)
    }));
  };

  const isLoading = loading;

  return (
    <ContainerWithBackground>
      <Stack spacing={3}>
        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Header with back button */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/analysis')}
            variant="text"
            color="inherit"
            disabled={isLoading}
          >
            Back
          </Button>
          <Typography variant="h5">Configure Chart</Typography>
        </Stack>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              {/* Chart name and info */}
              <Stack spacing={2}>
                <TextField
                  label="Chart Name"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  fullWidth
                  placeholder="e.g., Customer Satisfaction 2024"
                  disabled={isLoading}
                />

                {/* Chart type selector */}
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">Chart Type</Typography>
                  <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    onChange={handleChartTypeChange}
                    size="small"
                    disabled={isLoading}
                  >
                    <ToggleButton value="question">Question</ToggleButton>
                    <ToggleButton value="comparison">Comparison</ToggleButton>
                    <ToggleButton value="response_trend">Response Trend</ToggleButton>
                    <ToggleButton value="geo">Geographical</ToggleButton>
                    <ToggleButton value="word_cloud">Word Cloud</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Stack>

              {/* Configuration section */}
              <Stack spacing={2.5}>
                <QuestionConfigurationSection
                  title={
                    chartType === 'comparison'
                      ? 'First Question'
                      : chartType === 'geo'
                        ? 'Location Source Question'
                        : 'Question Selection'
                  }
                  selection={block.questionA}
                  onSelect={() =>
                    openSelector({
                      slot: 'A',
                      allowText: chartType === 'word_cloud' ? 'text_only' : true,
                      title: 'Select a Question'
                    })
                  }
                  surveyLookup={surveyLookup}
                  onSurveySelectionChange={(nextSurveyIds) => setSurveySelection('A', nextSurveyIds)}
                  disabled={isLoading}
                />

                {chartType === 'geo' && (
                  <GeoSettingsSection
                    questionSelection={block.questionA}
                    geoSettings={geoSettings}
                    onGeoChange={updateGeoSettings}
                    disabled={isLoading}
                  />
                )}

                {(chartType === 'comparison' || (chartType === 'geo' && geoSettings.mode === 'per_answer')) && (
                  <QuestionConfigurationSection
                    title={chartType === 'comparison' ? 'Second Question' : 'Answer Filter Question'}
                    selection={block.questionB}
                    onSelect={() =>
                      openSelector({
                        slot: 'B',
                        allowText: false,
                        title:
                          chartType === 'comparison'
                            ? 'Select Second Question'
                            : 'Select Answer Filter Question'
                      })
                    }
                    surveyLookup={surveyLookup}
                    onSurveySelectionChange={(nextSurveyIds) =>
                      setSurveySelection(
                        'B',
                        nextSurveyIds.filter((surveyId) => (block.questionA?.surveyIds || []).includes(surveyId))
                      )
                    }
                    disabled={isLoading}
                  />
                )}

                {chartType === 'geo' && geoSettings.mode === 'per_answer' && (
                  <GeoAnswerSelectorSection
                    filterSelection={block.questionB}
                    surveyLookup={surveyLookup}
                    geoSettings={geoSettings}
                    onGeoChange={updateGeoSettings}
                    disabled={isLoading}
                  />
                )}

                {chartType === 'response_trend' && (
                  <ResponseTrendSettingsSection
                    questionSelection={block.questionA}
                    surveyLookup={surveyLookup}
                    trendSettings={trendSettings}
                    onTrendChange={updateTrendSettings}
                    disabled={isLoading || !block.questionA?.questionKey}
                  />
                )}

                {chartType === 'geo' && geoSettings.mode === 'per_question' && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      All location responses will be displayed on the map grouped by location name.
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Date range */}
              {chartType !== 'response_trend' && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Date Range</Typography>
                  <DateRangeFields
                    startDate={block.startDate}
                    endDate={block.endDate}
                    onChange={(changes) => updateBlock(changes)}
                    disabled={isLoading}
                  />
                </Stack>
              )}

              {/* Chart preview */}
              <Stack spacing={1}>
                <Typography variant="subtitle2">Preview</Typography>
                {chartType === 'comparison'
                  ? renderComparisonChart()
                  : renderQuestionChart()}
              </Stack>

              {/* Save button */}
              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button
                  variant="text"
                  onClick={() => navigate('/analysis')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  endIcon={<Save />}
                  onClick={handleSave}
                  disabled={isLoading || !chartName.trim() || !block.questionA?.questionKey}
                >
                  {chartId ? 'Update Chart' : 'Save Chart'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <QuestionSelectorDialog
        open={selectorState.open}
        surveys={surveys}
        loading={isLoading}
        questionFilter={selectorState.questionFilter}
        title={selectorState.title}
        onClose={closeSelector}
        onSelectQuestion={applyQuestionSelection}
      />

      <Backdrop
        open={isLoading}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2, flexDirection: 'column', gap: 1.5 }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1">Loading surveys and chart configuration...</Typography>
      </Backdrop>
    </ContainerWithBackground>
  );
}
