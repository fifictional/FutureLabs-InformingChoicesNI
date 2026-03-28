export function parseFormSchema(rawSchema) {
  if (!rawSchema) return null;
  if (typeof rawSchema === 'object') return rawSchema;
  if (typeof rawSchema !== 'string') return null;

  try {
    return JSON.parse(rawSchema);
  } catch {
    return null;
  }
}

export function formatAnswerValue(response) {
  if (response?.valueChoice != null && response.valueChoice !== '') {
    return String(response.valueChoice);
  }

  if (response?.valueText != null && response.valueText !== '') {
    return String(response.valueText);
  }

  if (response?.valueNumber != null && Number.isFinite(response.valueNumber)) {
    return String(response.valueNumber);
  }

  return 'No answer';
}

export function getQuestionLabel(index, question, schema) {
  if (schema?.source === 'excel' && Array.isArray(schema?.questionHeaders)) {
    const header = schema.questionHeaders[index];
    if (header) return String(header);
  }

  if (Array.isArray(schema?.items)) {
    const titledItems = schema.items
      .filter((item) => item?.title)
      .map((item) => String(item.title).trim())
      .filter(Boolean);

    if (titledItems[index]) {
      return titledItems[index];
    }
  }

  return `Question ${index + 1} (ID: ${question.id})`;
}

export function isNumericResponse(response) {
  if (response?.valueNumber != null && Number.isFinite(response.valueNumber)) {
    return true;
  }
  return false;
}

export function extractNumericValue(response) {
  if (response?.valueNumber != null && Number.isFinite(response.valueNumber)) {
    return response.valueNumber;
  }
  return null;
}

export function calculateNumericStats(numbers) {
  if (numbers.length === 0) {
    return null;
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  let median;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  return {
    count: sorted.length,
    mean: mean.toFixed(2),
    median: median.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    range: range.toFixed(2)
  };
}

export function calculateXAxisDomain(chartData) {
  if (!chartData || chartData.length === 0) {
    return [0, 10];
  }

  const values = chartData.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    const extension = Math.abs(min) * 0.5 || 5;
    return [min - extension, max + extension];
  }

  const extension = range * 0.05;
  return [min - extension, max + extension];
}

export function generateCleanTicks(domain) {
  if (!domain || domain.length !== 2) {
    return undefined;
  }

  const [min, max] = domain;
  const range = max - min;

  let step = Math.pow(10, Math.floor(Math.log10(range)));
  const normalized = range / step;

  if (normalized < 1.5) {
    step /= 10;
  } else if (normalized < 3) {
    step /= 5;
  } else if (normalized < 7) {
    step /= 2;
  }

  const ticks = [];
  let current = Math.ceil(min / step) * step;

  while (current <= max) {
    current = parseFloat(current.toFixed(10));
    ticks.push(current);
    current += step;
  }

  return ticks.length > 0 ? ticks : undefined;
}

export function formatTickLabel(value) {
  const rounded = parseFloat(value.toFixed(6));
  return rounded.toString();
}
