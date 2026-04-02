export const RESPONSE_TREND_INTERVAL_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const RESPONSE_TREND_RANGE_OPTIONS = {
  hourly: [
    { value: 'last_6_hours', label: 'Last 6 hours', amount: 6, unit: 'hours' },
    { value: 'last_12_hours', label: 'Last 12 hours', amount: 12, unit: 'hours' },
    { value: 'last_24_hours', label: 'Last 24 hours', amount: 24, unit: 'hours' }
  ],
  daily: [
    { value: 'last_7_days', label: 'Last 7 days', amount: 7, unit: 'days' },
    { value: 'last_14_days', label: 'Last 14 days', amount: 14, unit: 'days' },
    { value: 'last_30_days', label: 'Last 30 days', amount: 30, unit: 'days' }
  ],
  weekly: [
    { value: 'last_6_weeks', label: 'Last 6 weeks', amount: 6, unit: 'weeks' },
    { value: 'last_12_weeks', label: 'Last 12 weeks', amount: 12, unit: 'weeks' },
    { value: 'last_26_weeks', label: 'Last 6 months', amount: 26, unit: 'weeks' }
  ],
  monthly: [
    { value: 'last_3_months', label: 'Last 3 months', amount: 3, unit: 'months' },
    { value: 'last_6_months', label: 'Last 6 months', amount: 6, unit: 'months' },
    { value: 'last_12_months', label: 'Last 12 months', amount: 12, unit: 'months' }
  ],
  yearly: [
    { value: 'last_3_years', label: 'Last 3 years', amount: 3, unit: 'years' },
    { value: 'last_5_years', label: 'Last 5 years', amount: 5, unit: 'years' },
    { value: 'all_time', label: 'All time', allTime: true }
  ]
};

const DEFAULT_RESPONSE_TREND_RANGE = {
  hourly: 'last_24_hours',
  daily: 'last_30_days',
  weekly: 'last_26_weeks',
  monthly: 'last_12_months',
  yearly: 'all_time'
};

function cloneDate(date) {
  return new Date(date.getTime());
}

function startOfDay(date) {
  const next = cloneDate(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfHour(date) {
  const next = cloneDate(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function startOfMonth(date) {
  const next = cloneDate(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfYear(date) {
  const next = cloneDate(date);
  next.setMonth(0, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfInterval(date, interval) {
  if (interval === 'hourly') return startOfHour(date);
  if (interval === 'daily') return startOfDay(date);
  if (interval === 'weekly') return startOfWeek(date);
  if (interval === 'monthly') return startOfMonth(date);
  return startOfYear(date);
}

function addInterval(date, interval, amount = 1) {
  const next = cloneDate(date);
  if (interval === 'hourly') {
    next.setHours(next.getHours() + amount);
    return next;
  }
  if (interval === 'daily') {
    next.setDate(next.getDate() + amount);
    return next;
  }
  if (interval === 'weekly') {
    next.setDate(next.getDate() + amount * 7);
    return next;
  }
  if (interval === 'monthly') {
    next.setMonth(next.getMonth() + amount);
    return next;
  }
  next.setFullYear(next.getFullYear() + amount);
  return next;
}

function subtractFromDate(date, amount, unit) {
  if (!amount || !unit) {
    return cloneDate(date);
  }

  if (unit === 'hours') return addInterval(date, 'hourly', -amount);
  if (unit === 'days') return addInterval(date, 'daily', -amount);
  if (unit === 'weeks') return addInterval(date, 'weekly', -amount);
  if (unit === 'months') return addInterval(date, 'monthly', -amount);
  return addInterval(date, 'yearly', -amount);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

function formatTickLabel(date, interval) {
  if (interval === 'hourly') {
    return formatDate(date, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (interval === 'daily') {
    return formatDate(date, { day: 'numeric', month: 'short' });
  }
  if (interval === 'weekly') {
    return `Week of ${formatDate(date, { day: 'numeric', month: 'short' })}`;
  }
  if (interval === 'monthly') {
    return formatDate(date, { month: 'short', year: 'numeric' });
  }
  return formatDate(date, { year: 'numeric' });
}

function formatTooltipLabel(startDate, endDate, interval) {
  if (interval === 'hourly') {
    return formatDate(startDate, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (interval === 'daily') {
    return formatDate(startDate, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (interval === 'weekly') {
    return `${formatDate(startDate, { day: 'numeric', month: 'short', year: 'numeric' })} - ${formatDate(
      addInterval(endDate, 'daily', -1),
      { day: 'numeric', month: 'short', year: 'numeric' }
    )}`;
  }

  if (interval === 'monthly') {
    return formatDate(startDate, { month: 'long', year: 'numeric' });
  }

  return formatDate(startDate, { year: 'numeric' });
}

function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function calculateStats(values) {
  if (!values.length) {
    return {
      count: 0,
      average: null,
      median: null,
      min: null,
      max: null
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    average: total / values.length,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

export function createResponseTrendSettings(overrides = {}) {
  const interval = overrides.interval || 'daily';
  return {
    interval,
    rangePreset: overrides.rangePreset || DEFAULT_RESPONSE_TREND_RANGE[interval],
    selectedChoice: overrides.selectedChoice || '',
    cumulative: Boolean(overrides.cumulative)
  };
}

export function getResponseTrendRangeOptions(interval) {
  return RESPONSE_TREND_RANGE_OPTIONS[interval] || RESPONSE_TREND_RANGE_OPTIONS.daily;
}

export function normalizeResponseTrendSettings(settings = {}) {
  const interval = RESPONSE_TREND_INTERVAL_OPTIONS.some(
    (option) => option.value === settings.interval
  )
    ? settings.interval
    : 'daily';

  const rangeOptions = getResponseTrendRangeOptions(interval);
  const rangePreset = rangeOptions.some((option) => option.value === settings.rangePreset)
    ? settings.rangePreset
    : DEFAULT_RESPONSE_TREND_RANGE[interval];

  return createResponseTrendSettings({
    interval,
    rangePreset,
    selectedChoice: settings.selectedChoice || '',
    cumulative: settings.cumulative
  });
}

export function buildResponseTrendSeries({
  rows,
  answerType,
  selectedChoice,
  interval,
  rangePreset,
  cumulative = false
}) {
  const datedRows = rows.filter((row) => Number.isFinite(row.submittedAtMs));
  if (!datedRows.length) {
    return { type: 'empty' };
  }

  if (answerType === 'choice' && !selectedChoice) {
    return { type: 'needs_choice' };
  }

  const timestamps = datedRows.map((row) => row.submittedAtMs);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const endDate = new Date(maxTimestamp);
  const intervalStart = startOfInterval(endDate, interval);
  const rangeOption =
    getResponseTrendRangeOptions(interval).find((option) => option.value === rangePreset) ||
    getResponseTrendRangeOptions(interval)[0];

  const rawStartDate = rangeOption?.allTime
    ? new Date(minTimestamp)
    : subtractFromDate(intervalStart, Math.max((rangeOption.amount || 1) - 1, 0), rangeOption.unit);
  const startDate = startOfInterval(rawStartDate, interval);
  const boundedStart =
    startDate.getTime() < minTimestamp
      ? startOfInterval(new Date(minTimestamp), interval)
      : startDate;

  const buckets = [];
  let bucketStart = boundedStart;
  const finalBucketStart = startOfInterval(endDate, interval);

  while (bucketStart.getTime() <= finalBucketStart.getTime()) {
    const bucketEnd = addInterval(bucketStart, interval, 1);
    buckets.push({
      bucketStartMs: bucketStart.getTime(),
      bucketEndMs: bucketEnd.getTime(),
      label: formatTickLabel(bucketStart, interval),
      tooltipLabel: formatTooltipLabel(bucketStart, bucketEnd, interval),
      values: [],
      count: 0
    });
    bucketStart = bucketEnd;
  }

  const findBucket = (timestamp) =>
    buckets.find((bucket) => timestamp >= bucket.bucketStartMs && timestamp < bucket.bucketEndMs);

  datedRows.forEach((row) => {
    const bucket = findBucket(row.submittedAtMs);
    if (!bucket) {
      return;
    }

    if (answerType === 'choice') {
      if (row.values.some((value) => String(value) === selectedChoice)) {
        bucket.count += 1;
      }
      return;
    }

    if (answerType === 'text') {
      bucket.count += row.values.length;
      return;
    }

    row.values
      .filter((value) => Number.isFinite(value))
      .forEach((value) => {
        bucket.values.push(value);
      });
  });

  let runningCount = 0;
  let runningValues = [];

  const points = buckets.map((bucket) => {
    if (answerType === 'number') {
      const stats = cumulative
        ? calculateStats((runningValues = [...runningValues, ...bucket.values]))
        : calculateStats(bucket.values);

      return {
        label: bucket.label,
        tooltipLabel: bucket.tooltipLabel,
        value: stats.average,
        count: stats.count,
        average: stats.average,
        median: stats.median,
        min: stats.min,
        max: stats.max
      };
    }

    runningCount += bucket.count;
    return {
      label: bucket.label,
      tooltipLabel: bucket.tooltipLabel,
      value: cumulative ? runningCount : bucket.count,
      count: cumulative ? runningCount : bucket.count
    };
  });

  return {
    type: 'trend',
    interval,
    rangePreset: rangeOption.value,
    metricType: answerType === 'number' ? 'average' : 'count',
    metricLabel:
      answerType === 'number'
        ? cumulative
          ? 'Cumulative average response'
          : 'Average response'
        : cumulative
          ? 'Cumulative responses'
          : 'Responses',
    cumulative,
    points
  };
}
