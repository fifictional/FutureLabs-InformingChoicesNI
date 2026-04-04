/* eslint-disable react/prop-types */

import { Add, Delete, Download, DragIndicator, Edit, Refresh } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
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
  normalizeGeoSettings,
  selectionCoversSurveyIds
} from '../common/geoUtils.js';
import { exportElementAsPng } from '../common/exportChartImage.js';

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

function normalizeQuestionText(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildQuestionKey(text, answerType) {
  return `${normalizeQuestionText(text)}::${String(answerType || '').toLowerCase()}`;
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

function reorderChartsList(charts, activeId, overId) {
  if (activeId === overId) {
    return charts;
  }

  const currentIndex = charts.findIndex((chart) => chart.id === activeId);
  const nextIndex = charts.findIndex((chart) => chart.id === overId);

  if (currentIndex === -1 || nextIndex === -1) {
    return charts;
  }

  const nextCharts = [...charts];
  const [movedChart] = nextCharts.splice(currentIndex, 1);
  nextCharts.splice(nextIndex, 0, movedChart);
  return nextCharts;
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

function SavedChartDisplay({
  chart,
  surveys,
  onConfigure,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  isDropTarget = false,
  disableDragging = false
}) {
  const chartCardRef = useRef(null);
  const chartExportRef = useRef(null);
  const [dateRangeStart, setDateRangeStart] = useState(chart.configuration?.startDate || '');
  const [dateRangeEnd, setDateRangeEnd] = useState(chart.configuration?.endDate || '');
  const [trendSettings, setTrendSettings] = useState(() =>
    normalizeResponseTrendSettings(chart.configuration?.trend)
  );
  const [geoSelectedAnswer, setGeoSelectedAnswer] = useState(() => {
    const geoSettings = normalizeGeoSettings(chart.configuration?.geo);
    return geoSettings.selectedChoice || '';
  });
  // drilldown: { axis: 'row'|'col', label: string } | null
  const [drilldown, setDrilldown] = useState(null);
  const [exporting, setExporting] = useState(false);
  const surveyLookup = Object.fromEntries(surveys.map((survey) => [survey.id, survey]));
  const trendChoiceOptions = collectChoiceOptionsForSelection(chart.configuration?.questionA, surveyLookup);
  const geoChoiceOptions = collectChoiceOptionsForSelection(chart.configuration?.questionB, surveyLookup);

  useEffect(() => {
    if (chart.chartType === 'response_trend') {
      const answerType = chart.configuration?.questionA?.answerType;
      if (answerType === 'choice') {
        if (!trendChoiceOptions.length) {
          return;
        }

        if (!trendChoiceOptions.includes(trendSettings.selectedChoice)) {
          setTrendSettings((previous) => ({
            ...normalizeResponseTrendSettings(previous),
            selectedChoice: trendChoiceOptions[0]
          }));
        }

        return;
      }

      if (trendSettings.selectedChoice) {
        setTrendSettings((previous) => ({
          ...normalizeResponseTrendSettings(previous),
          selectedChoice: ''
        }));
      }
    }

    if (chart.chartType === 'geo') {
      const geoSettings = normalizeGeoSettings(chart.configuration?.geo);
      if (geoSettings.mode === 'per_answer' && geoChoiceOptions.length) {
        if (!geoChoiceOptions.includes(geoSelectedAnswer)) {
          setGeoSelectedAnswer(geoChoiceOptions[0]);
        }
      } else {
        setGeoSelectedAnswer('');
      }
    }
  }, [chart.chartType, chart.configuration?.questionA?.answerType, trendChoiceOptions, trendSettings.selectedChoice, geoChoiceOptions, geoSelectedAnswer, chart.configuration?.geo]);

  const updateTrendSettings = (changes) => {
    setTrendSettings((previous) => {
      const currentTrend = normalizeResponseTrendSettings(previous);
      const nextInterval = changes.interval || currentTrend.interval;
      const availableRanges = getResponseTrendRangeOptions(nextInterval);
      const requestedRange = changes.rangePreset || currentTrend.rangePreset;
      const nextRangePreset = availableRanges.some((option) => option.value === requestedRange)
        ? requestedRange
        : availableRanges[availableRanges.length - 1].value;

      return {
        ...currentTrend,
        ...changes,
        interval: nextInterval,
        rangePreset: nextRangePreset
      };
    });
  };

  const buildChartData = () => {
    const config = chart.configuration;
    const selection = config.questionA;
    const geoSettings = normalizeGeoSettings(config.geo);

    if (!selection?.questionKey || !selection?.answerType) {
      return { type: 'empty' };
    }

    const rows = [];
    selection.surveyIds.forEach((surveyId) => {
      const survey = surveyLookup[surveyId];
      if (!survey) return;

      const question = survey.questionByKey?.[selection.questionKey];
      if (!question) return;

      const responseRows = survey.responsesByQuestionId?.[question.id] || [];
      responseRows.forEach((item) => {
        if (
          chart.chartType !== 'response_trend'
          && !matchesRange(item.submittedAtMs, dateRangeStart, dateRangeEnd)
        ) {
          return;
        }

        const parsedValues = parseResponseValues(item.response, selection.answerType);
        if (!parsedValues.length) return;

        rows.push({
          surveyId,
          responderKey: item.externalId || `${surveyId}-${item.submissionId}`,
          submittedAtMs: item.submittedAtMs,
          values: parsedValues
        });
      });
    });

    if (!rows.length) {
      return { type: 'empty' };
    }

    if (chart.chartType === 'response_trend') {
      return buildResponseTrendSeries({
        rows,
        answerType: selection.answerType,
        selectedChoice: trendSettings.selectedChoice,
        interval: trendSettings.interval,
        rangePreset: trendSettings.rangePreset,
        cumulative: trendSettings.cumulative
      });
    }

    if (chart.chartType === 'geo') {
      if (geoSettings.mode === 'per_answer') {
        const filterSelection = config.questionB;
        if (!filterSelection?.questionKey) {
          return { type: 'needs_filter_question' };
        }

        if (!selectionCoversSurveyIds(filterSelection, selection.surveyIds || [])) {
          return { type: 'needs_comparable_question' };
        }

        if (!geoSelectedAnswer) {
          return { type: 'needs_answer' };
        }

        const filterRows = [];
        (selection.surveyIds || []).forEach((surveyId) => {
          const survey = surveyLookup[surveyId];
          if (!survey) return;

          const question = survey.questionByKey?.[filterSelection.questionKey];
          if (!question) return;

          const responseRows = survey.responsesByQuestionId?.[question.id] || [];
          responseRows.forEach((item) => {
            const parsedValues = parseResponseValues(item.response, filterSelection.answerType);
            if (!parsedValues.length) return;

            filterRows.push({
              surveyId,
              responderKey: item.externalId || `${surveyId}-${item.submissionId}`,
              submittedAtMs: item.submittedAtMs,
              values: parsedValues
            });
          });
        });

        return buildGeoSeries({
          mode: geoSettings.mode,
          locationRows: rows,
          filterRows,
          selectedChoice: geoSelectedAnswer
        });
      }

      return buildGeoSeries({
        mode: geoSettings.mode,
        locationRows: rows
      });
    }

    if (chart.chartType === 'word_cloud') {
      const textValues = rows.flatMap((row) => row.values.map((value) => String(value)));
      return { type: 'text', textValues };
    }

    if (selection.answerType === 'text') {
      const textValues = rows.flatMap((row) => row.values.map((value) => String(value)));
      return { type: 'text_list', textValues };
    }

    if (selection.answerType === 'number') {
      const values = rows.flatMap((row) => row.values).filter((value) => Number.isFinite(value));
      return { type: 'number', values };
    }

    const counts = new Map();
    rows.forEach((row) => {
      row.values.forEach((value) => {
        const label = String(value);
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });

    // Add available choices with 0 count
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

    labels.forEach((label) => {
      if (!counts.has(label)) {
        counts.set(label, 0);
      }
    });

    const data = [...labels].map((label) => ({ label, count: counts.get(label) || 0 }));
    return { type: 'choice', data };
  };

  const buildComparisonChartData = () => {
    const config = chart.configuration;
    const selectionA = config.questionA;
    const selectionB = config.questionB;

    if (!selectionA?.questionKey || !selectionB?.questionKey) {
      return { type: 'empty' };
    }

    if (selectionA.answerType === 'text' || selectionB.answerType === 'text') {
      return { type: 'invalid' };
    }

    const collectRows = (selection) => {
      const rows = [];
      selection.surveyIds.forEach((surveyId) => {
        const survey = surveyLookup[surveyId];
        if (!survey) return;

        const question = survey.questionByKey?.[selection.questionKey];
        if (!question) return;

        const responseRows = survey.responsesByQuestionId?.[question.id] || [];
        responseRows.forEach((item) => {
          if (!matchesRange(item.submittedAtMs, dateRangeStart, dateRangeEnd)) return;

          const parsedValues = parseResponseValues(item.response, selection.answerType);
          if (!parsedValues.length) return;

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

    const rowsA = collectRows(selectionA);
    const rowsB = collectRows(selectionB);

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
      const collectLabels = (selection, rows) => {
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

      const rowLabels = collectLabels(selectionA, rowsA);
      const columnLabels = collectLabels(selectionB, rowsB);
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

      return { type: 'heatmap', rowLabels, columnLabels, points, respondents: overlappingKeys.length };
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

    // Stacked histogram
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

    const collectLabels = (selection, rows) => {
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

    const categories = collectLabels(choiceSelection, aIsChoice ? rowsA : rowsB);

    return {
      type: 'stacked_histogram',
      values: stackedValues,
      seriesByValue: categories,
      respondents: overlappingKeys.length,
      numericAxisLabel: numericSelection.questionText
    };
  };

  const renderChart = () => {
    if (chart.chartType === 'comparison') {
      const data = buildComparisonChartData();

      if (data.type === 'invalid' || data.type === 'empty') {
        return <EmptyChart message={data.type === 'invalid' ? 'Invalid comparison chart configuration' : undefined} />;
      }

      if (data.type === 'heatmap') {
        if (drilldown) {
          const isRow = drilldown.axis === 'row';
          const barData = isRow
            ? data.columnLabels.map((col) => ({
                label: col,
                count: data.points.find((p) => p.rowLabel === drilldown.label && p.columnLabel === col)?.count || 0
              }))
            : data.rowLabels.map((row) => ({
                label: row,
                count: data.points.find((p) => p.rowLabel === row && p.columnLabel === drilldown.label)?.count || 0
              }));
          return (
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => setDrilldown(null)}>
                  ← Back to grid
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {isRow ? `Row: "${drilldown.label}"` : `Column: "${drilldown.label}"`}
                </Typography>
              </Stack>
              <ChoiceBarChart data={barData} />
            </Stack>
          );
        }
        return (
          <HeatMapChart
            rowLabels={data.rowLabels}
            columnLabels={data.columnLabels}
            points={data.points}
            onRowClick={(label) => setDrilldown({ axis: 'row', label })}
            onColumnClick={(label) => setDrilldown({ axis: 'col', label })}
          />
        );
      }

      if (data.type === 'scatter') {
        return <ScatterComparisonChart points={data.points} />;
      }

      return <StackedHistogramChart values={data.values} />;
    }

    const data = buildChartData();

    if (data.type === 'empty') {
      return <EmptyChart />;
    }

    if (data.type === 'number') {
      return <NumericHistogramChart values={data.values} />;
    }

    if (data.type === 'needs_choice') {
      return <EmptyChart message="Select an answer to plot its response trend." />;
    }

    if (data.type === 'needs_filter_question') {
      return <EmptyChart message="This chart needs a configured answer filter question." />;
    }

    if (data.type === 'needs_comparable_question') {
      return <EmptyChart message="Filter question must exist on all selected location surveys." />;
    }

    if (data.type === 'needs_answer') {
      return <EmptyChart message="Select an answer to filter map locations." />;
    }

    if (data.type === 'trend') {
      return <ResponseTrendChart points={data.points} metricLabel={data.metricLabel} />;
    }

    if (data.type === 'geo') {
      return <GeoChart locations={data.locations} />;
    }

    if (data.type === 'text') {
      return <WordCloudChart textValues={data.textValues} />;
    }

    if (data.type === 'text_list') {
      return <TextResponsesList textValues={data.textValues} />;
    }

    return <ChoiceBarChart data={data.data} />;
  };

  const formattedDate = new Date(chart.updatedAt).toLocaleDateString();

  const handleExport = async () => {
    if (!chartExportRef.current || exporting) {
      return;
    }

    setExporting(true);
    try {
      await exportElementAsPng(chartExportRef.current, chart.name);
    } catch (error) {
      alert(error?.message || 'Failed to export chart image.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box
      onDragOver={(event) => onDragOver?.(event, chart.id)}
      onDrop={(event) => onDrop?.(event, chart.id)}
      sx={{
        minWidth: 0,
        opacity: isDragging ? 0.55 : 1,
        transform: isDropTarget ? 'translateY(-2px)' : 'none',
        transition: 'transform 140ms ease, opacity 140ms ease'
      }}
    >
      <Card
        ref={chartCardRef}
        sx={{
          height: '100%',
          border: '1px solid',
          borderColor: isDropTarget ? 'primary.main' : 'divider',
          boxShadow: isDropTarget ? 4 : 1
        }}
      >
      <CardContent>
        <Stack spacing={2}>
          {/* Header with title and actions */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="baseline" flex={1}>
              <Box
                draggable={!disableDragging}
                onDragStart={(event) => onDragStart?.(event, chart.id)}
                onDragEnd={onDragEnd}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  cursor: disableDragging ? 'default' : 'grab',
                  userSelect: 'none'
                }}
                aria-label="Drag chart to reorder"
                title={disableDragging ? 'Reordering unavailable while saving' : 'Drag to reorder'}
              >
                <DragIndicator fontSize="small" />
              </Box>
              <Stack spacing={0.5} flex={1}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.25, sm: 1.5 }}
                  alignItems={{ xs: 'flex-start', sm: 'baseline' }}
                >
                  <Typography variant="h6">{chart.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {formattedDate}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                color="primary"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <Refresh fontSize="small" /> : <Download fontSize="small" />}
              </IconButton>
              <IconButton
                size="small"
                color="primary"
                onClick={() => onConfigure(chart.id)}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(chart.id)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {chart.chartType === 'response_trend' ? (
            <Stack spacing={1.5}>
              {chart.configuration?.questionA?.answerType === 'choice' && (
                <TextField
                  select
                  label="Answer"
                  value={trendSettings.selectedChoice || ''}
                  onChange={(event) => updateTrendSettings({ selectedChoice: event.target.value })}
                  size="small"
                  disabled={!trendChoiceOptions.length}
                >
                  {trendChoiceOptions.map((choice) => (
                    <MenuItem key={choice} value={choice}>
                      {choice}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Interval"
                  value={trendSettings.interval}
                  onChange={(event) => updateTrendSettings({ interval: event.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  {RESPONSE_TREND_INTERVAL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Range"
                  value={trendSettings.rangePreset}
                  onChange={(event) => updateTrendSettings({ rangePreset: event.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  {getResponseTrendRangeOptions(trendSettings.interval).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Mode"
                  value={trendSettings.cumulative ? 'cumulative' : 'period'}
                  onChange={(event) => updateTrendSettings({ cumulative: event.target.value === 'cumulative' })}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="period">Per interval</MenuItem>
                  <MenuItem value="cumulative">Cumulative</MenuItem>
                </TextField>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {chart.chartType === 'geo' && normalizeGeoSettings(chart.configuration?.geo).mode === 'per_answer' && (
                <TextField
                  select
                  label="Answer"
                  value={geoSelectedAnswer || ''}
                  onChange={(event) => setGeoSelectedAnswer(event.target.value)}
                  size="small"
                  disabled={!geoChoiceOptions.length}
                >
                  {geoChoiceOptions.map((choice) => (
                    <MenuItem key={choice} value={choice}>
                      {choice}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start date"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value || '')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="End date"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value || '')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  size="small"
                  sx={{ flex: 1 }}
                />
              </Stack>
            </Stack>
          )}
          {/* Export only the rendered chart area (exclude filters and action buttons). */}
          <Box ref={chartExportRef} sx={{ width: '100%', minWidth: 0 }}>
            {renderChart()}
          </Box>
        </Stack>
      </CardContent>
      </Card>
    </Box>
  );
}

export default function Analysis() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState(null);
  const [addChartDialogOpen, setAddChartDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draggedChartId, setDraggedChartId] = useState(null);
  const [dropTargetChartId, setDropTargetChartId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        // Load forms and events data
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

          // Load saved charts
          const savedCharts = await window.api.charts.list();
          const enrichedCharts = savedCharts.map((chart) => ({
            ...chart,
            configuration: JSON.parse(chart.configuration)
          }));

          setCharts(enrichedCharts);
        }
      } catch (error) {
        console.error('Failed to load analysis data', error);
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
  }, [refreshKey]);

  const handleAddChart = async (type) => {
    const defaultNames = {
      question: 'New Question Chart',
      comparison: 'New Comparison Chart',
      response_trend: 'New Response Trend',
      geo: 'New Geographical Map',
      word_cloud: 'New Word Cloud'
    };
    try {
      const result = await window.api.charts.create({
        name: defaultNames[type] || 'New Chart',
        chartType: type,
        configuration: {}
      });
      const newChart = Array.isArray(result) ? result[0] : result;
      if (newChart) {
        setCharts((prev) => [...prev, { ...newChart, configuration: JSON.parse(newChart.configuration) }]);
      }
      setAddChartDialogOpen(false);
    } catch (error) {
      console.error('Failed to create chart', error);
      alert('Failed to create chart');
    }
  };

  const handleConfigure = (chartId) => {
    navigate(`/analysis/configure-chart/${chartId}`);
  };

  const handleDeleteClick = (chartId) => {
    setChartToDelete(chartId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (chartToDelete) {
      try {
        await window.api.charts.delete(chartToDelete);
        setCharts((prev) => prev.filter((c) => c.id !== chartToDelete));
        setDeleteDialogOpen(false);
        setChartToDelete(null);
      } catch (error) {
        console.error('Failed to delete chart', error);
        alert('Failed to delete chart');
      }
    }
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleDragStart = (event, chartId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(chartId));
    setDraggedChartId(chartId);
    setDropTargetChartId(chartId);
  };

  const handleDragEnd = () => {
    setDraggedChartId(null);
    setDropTargetChartId(null);
  };

  const handleDragOver = (event, chartId) => {
    if (savingOrder || draggedChartId == null || draggedChartId === chartId) {
      return;
    }

    event.preventDefault();
    if (dropTargetChartId !== chartId) {
      setDropTargetChartId(chartId);
    }
  };

  const handleDrop = async (event, chartId) => {
    event.preventDefault();

    if (savingOrder || draggedChartId == null || draggedChartId === chartId) {
      handleDragEnd();
      return;
    }

    const previousCharts = charts;
    const nextCharts = reorderChartsList(charts, draggedChartId, chartId);

    if (nextCharts === charts) {
      handleDragEnd();
      return;
    }

    setCharts(nextCharts);
    setSavingOrder(true);

    try {
      const reorderedCharts = await window.api.charts.reorder(nextCharts.map((chart) => chart.id));
      setCharts(
        reorderedCharts.map((chart) => ({
          ...chart,
          configuration: JSON.parse(chart.configuration)
        }))
      );
    } catch (error) {
      console.error('Failed to reorder charts', error);
      setCharts(previousCharts);
      alert('Failed to save chart order');
    } finally {
      setSavingOrder(false);
      handleDragEnd();
    }
  };

  return (
    <ContainerWithBackground>
      <Stack spacing={2.5}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="h5">Analysis Charts</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {savingOrder && (
              <Typography variant="caption" color="text.secondary">
                Saving chart order...
              </Typography>
            )}
            <IconButton onClick={handleRefresh} disabled={loading} title="Refresh charts">
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<Add />}
              disabled={loading}
              onClick={() => setAddChartDialogOpen(true)}
            >
              New Chart
            </Button>
          </Stack>
        </Stack>

        {loading && charts.length === 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={200} />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Charts grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            gap: 2
          }}
        >
          {charts.map((chart) => (
            <SavedChartDisplay
              key={chart.id}
              chart={chart}
              surveys={surveys}
              onConfigure={handleConfigure}
              onDelete={handleDeleteClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedChartId === chart.id}
              isDropTarget={dropTargetChartId === chart.id && draggedChartId !== chart.id}
              disableDragging={savingOrder}
            />
          ))}
        </Box>

        {charts.length === 0 && !loading && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary" gutterBottom>
                No charts yet. Create one to get started!
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddChartDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Create Your First Chart
              </Button>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Add chart type picker dialog */}
      <Dialog open={addChartDialogOpen} onClose={() => setAddChartDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Chart</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {[
              {
                type: 'question',
                label: 'Question Chart',
                description: 'Analyse responses to a single survey question using bar charts or histograms.'
              },
              {
                type: 'comparison',
                label: 'Comparison Chart',
                description: 'Compare two questions against each other using heatmaps or scatter plots.'
              },
              {
                type: 'response_trend',
                label: 'Response Trend',
                description: 'Track how responses change over time with sensible interval and range controls.'
              },
              {
                type: 'geo',
                label: 'Geographical Map',
                description: 'Visualise response locations on an interactive map.'
              },
              {
                type: 'word_cloud',
                label: 'Word Cloud',
                description: 'Visualise open-ended text responses as a word cloud.'
              }
            ].map(({ type, label, description }) => (
              <Card key={type} variant="outlined" sx={{ '&:hover': { borderColor: 'primary.main' } }}>
                <CardActionArea onClick={() => handleAddChart(type)} sx={{ p: 0 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="medium">{label}</Typography>
                    <Typography variant="body2" color="text.secondary">{description}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddChartDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Chart</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chart? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ContainerWithBackground>
  );
}
