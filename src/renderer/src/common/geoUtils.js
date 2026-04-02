// Geographical data utilities for geo chart aggregation
// Supports two modes: 'per_question' and 'per_answer' (similar to response_trend)

export const GEO_COORDINATES = {
  belfast: { lat: 54.5973, lng: -5.9301 },
  'east belfast': { lat: 54.595, lng: -5.86 },
  'north belfast': { lat: 54.63, lng: -5.95 },
  'south belfast and mid down': { lat: 54.45, lng: -5.9 },
  'west belfast': { lat: 54.6, lng: -5.99 },
  derry: { lat: 54.9966, lng: -7.3086 },
  londonderry: { lat: 54.9966, lng: -7.3086 },
  'east derry/londonderry': { lat: 55.02, lng: -6.95 },
  foyle: { lat: 54.99, lng: -7.32 },
  antrim: { lat: 54.7192, lng: -6.2073 },
  'north antrim': { lat: 55.08, lng: -6.35 },
  'east antrim': { lat: 54.85, lng: -5.85 },
  'south antrim': { lat: 54.67, lng: -6.13 },
  'mid and east antrim': { lat: 54.85, lng: -5.85 },
  carrickfergus: { lat: 54.7158, lng: -5.8058 },
  larne: { lat: 54.85, lng: -5.8167 },
  ballymena: { lat: 54.8639, lng: -6.2767 },
  'antrim and newtownabbey': { lat: 54.72, lng: -6.03 },
  newtownabbey: { lat: 54.66, lng: -5.9 },
  'ards and north down': { lat: 54.58, lng: -5.67 },
  ards: { lat: 54.58, lng: -5.67 },
  'north down': { lat: 54.58, lng: -5.67 },
  strangford: { lat: 54.38, lng: -5.58 },
  'lagan valley': { lat: 54.5, lng: -6.02 },
  fermanagh: { lat: 54.35, lng: -7.65 },
  'fermanagh and south tyrone': { lat: 54.41, lng: -7.17 },
  'fermanagh and omagh': { lat: 54.47, lng: -7.72 },
  tyrone: { lat: 54.65, lng: -7.35 },
  'west tyrone': { lat: 54.72, lng: -7.56 },
  'mid ulster': { lat: 54.65, lng: -6.75 },
  'causeway coast and glens': { lat: 55.05, lng: -6.65 },
  down: { lat: 54.33, lng: -5.7 },
  'south down': { lat: 54.23, lng: -5.9 },
  'newry mourne and down': { lat: 54.2, lng: -6.25 },
  'newry and armagh': { lat: 54.27, lng: -6.38 },
  'armagh city banbridge and craigavon': { lat: 54.4, lng: -6.4 },
  banbridge: { lat: 54.35, lng: -6.28 },
  'upper bann': { lat: 54.4, lng: -6.45 },
  'derry city and strabane': { lat: 54.98, lng: -7.32 },
  strabane: { lat: 54.82, lng: -7.47 },
  armagh: { lat: 54.3503, lng: -6.6528 },
  newry: { lat: 54.1753, lng: -6.3402 },
  lisburn: { lat: 54.5162, lng: -6.058 },
  bangor: { lat: 54.6648, lng: -5.6684 },
  coleraine: { lat: 55.1333, lng: -6.6667 },
  omagh: { lat: 54.6, lng: -7.3 },
  enniskillen: { lat: 54.3448, lng: -7.6384 },
  craigavon: { lat: 54.4478, lng: -6.387 }
};

export const GEO_CHART_MODES = [
  { value: 'per_question', label: 'By Question' },
  { value: 'per_answer', label: 'By Answer' }
];

export function createGeoSettings(overrides = {}) {
  return {
    mode: 'per_question',
    selectedChoice: '',
    ...overrides
  };
}

export function normalizeGeoSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return createGeoSettings();
  }

  const normalized = createGeoSettings(settings);

  // Validate mode
  if (!['per_question', 'per_answer'].includes(normalized.mode)) {
    normalized.mode = 'per_question';
  }

  // Validate selectedChoice
  if (typeof normalized.selectedChoice !== 'string') {
    normalized.selectedChoice = '';
  }

  return normalized;
}

function toLocationValues(rows) {
  const values = [];
  rows.forEach((row) => {
    row.values.forEach((value) => {
      const text = String(value).trim();
      if (text) {
        values.push(text);
      }
    });
  });
  return values;
}

function buildLocationsFromValues(values) {
  const locationCounts = new Map();
  const displayNames = new Map();

  values.forEach((locationStr) => {
    const locationKey = normalizeLocationName(locationStr);
    if (!locationKey) {
      return;
    }

    if (!displayNames.has(locationKey)) {
      displayNames.set(locationKey, locationStr);
    }
    locationCounts.set(locationKey, (locationCounts.get(locationKey) || 0) + 1);
  });

  const locations = [];
  let totalCount = 0;

  locationCounts.forEach((count, locationKey) => {
    const coords = GEO_COORDINATES[locationKey];
    if (!coords) {
      return;
    }

    locations.push({
      name: displayNames.get(locationKey) || locationKey,
      lat: coords.lat,
      lng: coords.lng,
      count
    });
    totalCount += count;
  });

  if (locations.length === 0) {
    return { type: 'empty' };
  }

  return {
    type: 'geo',
    locations,
    totalCount,
    hasData: true
  };
}

/**
 * Builds geographical series data for mapping.
 * For `per_question`, all location rows are aggregated.
 * For `per_answer`, location rows are filtered by responder keys whose filter-row answers match selectedChoice.
 */
export function buildGeoSeries({ mode, locationRows, filterRows, selectedChoice }) {
  if (!locationRows || locationRows.length === 0) {
    return { type: 'empty' };
  }

  if (mode !== 'per_answer') {
    return buildLocationsFromValues(toLocationValues(locationRows));
  }

  if (!selectedChoice) {
    return { type: 'needs_answer' };
  }

  if (!filterRows || filterRows.length === 0) {
    return { type: 'needs_filter_question' };
  }

  const matchingResponders = new Set();
  const selectedChoiceNormalized = selectedChoice.trim().toLowerCase();

  filterRows.forEach((row) => {
    const hasSelectedAnswer = row.values.some(
      (value) => String(value).trim().toLowerCase() === selectedChoiceNormalized
    );

    if (hasSelectedAnswer) {
      matchingResponders.add(row.responderKey);
    }
  });

  if (!matchingResponders.size) {
    return { type: 'empty' };
  }

  const filteredLocationRows = locationRows.filter((row) =>
    matchingResponders.has(row.responderKey)
  );
  if (!filteredLocationRows.length) {
    return { type: 'empty' };
  }

  return buildLocationsFromValues(toLocationValues(filteredLocationRows));
}

/**
 * Returns true if a question selection can cover all required survey IDs.
 */
export function selectionCoversSurveyIds(selection, requiredSurveyIds = []) {
  if (!selection?.questionKey) {
    return false;
  }

  const available = new Set(selection.availableSurveyIds || []);
  return requiredSurveyIds.every((surveyId) => available.has(surveyId));
}

export function clampSelectionSurveyIds(selection, targetSurveyIds = []) {
  if (!selection) {
    return selection;
  }

  const available = new Set(selection.availableSurveyIds || []);
  const normalized = [...new Set(targetSurveyIds.filter((surveyId) => available.has(surveyId)))];

  return {
    ...selection,
    surveyIds: normalized
  };
}

/**
 * Normalize location name for matching against GEO_COORDINATES
 */
function normalizeLocationName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '');
}
