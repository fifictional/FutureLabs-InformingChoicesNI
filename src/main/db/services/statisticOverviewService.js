import { and, count, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  events,
  eventTagMappings,
  eventTags,
  forms,
  questionChoice,
  questions,
  responses,
  statisticOverviews,
  submissions
} from '../schema';

const CONFIGURABLE_METRICS = [
  {
    name: 'avg_satisfaction',
    defaultQuestion: 'How satisfied are you?',
    description: 'Average satisfaction score',
    requirement: 'number'
  },
  {
    name: 'improved',
    defaultQuestion: 'Have you improved?',
    description: 'Percentage improved (Yes/No)',
    requirement: 'yes_no_choice'
  },
  {
    name: 'age_distribution',
    defaultQuestion: 'What is your age?',
    description: 'Age distribution',
    requirement: 'choice'
  },
  {
    name: 'referral_sources',
    defaultQuestion: 'How were you referred?',
    description: 'Referral source distribution',
    requirement: 'choice_or_text'
  },
  {
    name: 'geographical_distribution',
    defaultQuestion: 'Where are you based?',
    description: 'Geographical distribution',
    requirement: 'choice_or_text'
  }
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function parseNumber(valueText, valueNumber) {
  if (typeof valueNumber === 'number' && Number.isFinite(valueNumber)) return valueNumber;
  const parsed = Number(String(valueText ?? '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeReferenceId(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const lowered = text.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined' || lowered === '{}' || lowered === '[]') {
    return null;
  }

  return text;
}

function parseSchemaValue(schemaValue) {
  if (schemaValue == null) return null;
  if (typeof schemaValue === 'object') return schemaValue;
  if (typeof schemaValue !== 'string') return null;

  try {
    return JSON.parse(schemaValue);
  } catch {
    return null;
  }
}

function normalizeDashboardFilters(filters) {
  const startRaw = String(filters?.startDate || '').trim();
  const endRaw = String(filters?.endDate || '').trim();

  const startDate = startRaw ? new Date(`${startRaw}T00:00:00.000Z`) : null;
  const endDate = endRaw ? new Date(`${endRaw}T23:59:59.999Z`) : null;

  return {
    startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
    endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null
  };
}

function buildSubmittedAtWhere(submittedAtColumn, filters) {
  const conditions = [];
  if (filters?.startDate) conditions.push(gte(submittedAtColumn, filters.startDate));
  if (filters?.endDate) conditions.push(lte(submittedAtColumn, filters.endDate));

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

async function listSubmissionReferenceRows(filters = {}) {
  const db = getDb();
  const submittedAtWhere = buildSubmittedAtWhere(submissions.submittedAt, filters);

  const submissionRows = await db
    .select({
      submissionId: submissions.id,
      formId: submissions.formId,
      submittedAt: submissions.submittedAt,
      formSchema: forms.schema
    })
    .from(submissions)
    .leftJoin(forms, eq(forms.id, submissions.formId))
    .where(submittedAtWhere);

  let storedReferenceRows = [];
  try {
    storedReferenceRows = await db
      .select({ submissionId: submissions.id, userReferenceId: submissions.userReferenceId })
      .from(submissions)
      .where(submittedAtWhere);
  } catch {
    storedReferenceRows = [];
  }

  const storedReferenceBySubmission = new Map(
    storedReferenceRows.map((row) => [row.submissionId, normalizeReferenceId(row.userReferenceId)])
  );

  const formIds = Array.from(
    new Set(
      submissionRows
        .map((row) => Number(row.formId))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  const questionRowsByForm = new Map();
  if (formIds.length > 0) {
    const allQuestionRows = await db
      .select({ id: questions.id, formId: questions.formId, text: questions.text })
      .from(questions)
      .where(inArray(questions.formId, formIds));

    for (const row of allQuestionRows) {
      if (!questionRowsByForm.has(row.formId)) {
        questionRowsByForm.set(row.formId, []);
      }
      questionRowsByForm.get(row.formId).push(row);
    }
  }

  function resolveConfiguredReferenceQuestionId(formId, schema) {
    const questionsForForm = questionRowsByForm.get(formId) || [];

    const dbQuestionId = Number(schema?.userReferenceQuestionDbId);
    if (
      Number.isInteger(dbQuestionId) &&
      dbQuestionId > 0 &&
      questionsForForm.some((q) => q.id === dbQuestionId)
    ) {
      return dbQuestionId;
    }

    const rawLegacyId = String(schema?.userReferenceQuestionId ?? '').trim();
    if (!rawLegacyId) return null;

    const legacyNumericId = Number(rawLegacyId);
    if (
      Number.isInteger(legacyNumericId) &&
      legacyNumericId > 0 &&
      questionsForForm.some((q) => q.id === legacyNumericId)
    ) {
      return legacyNumericId;
    }

    if (Array.isArray(schema?.questions)) {
      const matchedQuestionDef = schema.questions.find((q) => {
        const questionId = String(q?.questionId ?? '').trim();
        return questionId && questionId === rawLegacyId;
      });

      const targetTitle = String(matchedQuestionDef?.title ?? '').trim();
      if (targetTitle) {
        const normalizedTargetTitle = normalizeText(targetTitle);
        const matchedDbQuestion = questionsForForm.find(
          (q) => normalizeText(q.text) === normalizedTargetTitle
        );
        if (matchedDbQuestion) return matchedDbQuestion.id;
      }
    }

    return null;
  }

  const referenceQuestionByForm = new Map();
  const referenceQuestionIds = new Set();
  const expectedQuestionBySubmission = new Map();

  for (const row of submissionRows) {
    if (!referenceQuestionByForm.has(row.formId)) {
      const schema = parseSchemaValue(row.formSchema);
      const resolvedQuestionId = resolveConfiguredReferenceQuestionId(row.formId, schema);
      if (resolvedQuestionId != null) {
        referenceQuestionByForm.set(row.formId, resolvedQuestionId);
        referenceQuestionIds.add(resolvedQuestionId);
      } else {
        referenceQuestionByForm.set(row.formId, null);
      }
    }

    const configuredQuestionId = referenceQuestionByForm.get(row.formId);
    if (configuredQuestionId != null) {
      expectedQuestionBySubmission.set(row.submissionId, configuredQuestionId);
    }
  }

  const derivedReferenceBySubmission = new Map();
  if (referenceQuestionIds.size > 0) {
    const responseRows = await db
      .select({
        submissionId: responses.submissionId,
        questionId: responses.questionId,
        valueText: responses.valueText,
        valueChoice: responses.valueChoice
      })
      .from(responses)
      .where(inArray(responses.questionId, Array.from(referenceQuestionIds)));

    for (const row of responseRows) {
      const expectedQuestionId = expectedQuestionBySubmission.get(row.submissionId);
      if (expectedQuestionId == null || row.questionId !== expectedQuestionId) continue;

      const rawValue = row.valueText ?? row.valueChoice;
      const normalized = normalizeReferenceId(rawValue);
      if (!normalized) continue;

      if (!derivedReferenceBySubmission.has(row.submissionId)) {
        derivedReferenceBySubmission.set(row.submissionId, normalized);
      }
    }
  }

  return submissionRows.map((row) => {
    const configuredReferenceQuestionId = referenceQuestionByForm.get(row.formId);
    const derivedReferenceId = derivedReferenceBySubmission.get(row.submissionId) || null;
    const storedReferenceId = storedReferenceBySubmission.get(row.submissionId) || null;

    return {
      submittedAt: row.submittedAt,
      // Prefer derived value from configured reference question; fallback to stored value.
      userReferenceId:
        configuredReferenceQuestionId != null
          ? derivedReferenceId || storedReferenceId
          : storedReferenceId
    };
  });
}

function questionMatchesRequirement(question, requirement, yesNoChoiceQuestionIds) {
  if (requirement === 'number') {
    return question.answerType === 'number';
  }

  if (requirement === 'choice') {
    return question.answerType === 'choice';
  }

  if (requirement === 'yes_no_choice') {
    return question.answerType === 'choice' && yesNoChoiceQuestionIds.has(question.id);
  }

  if (requirement === 'choice_or_text') {
    return question.answerType === 'choice' || question.answerType === 'text';
  }

  return true;
}

async function getYesNoChoiceQuestionIds() {
  const db = getDb();
  const allChoices = await db
    .select({ questionId: questionChoice.questionId, choiceText: questionChoice.choiceText })
    .from(questionChoice)
    .where(isNotNull(questionChoice.questionId));

  const choicesByQuestion = new Map();
  for (const row of allChoices) {
    const qid = row.questionId;
    if (!choicesByQuestion.has(qid)) {
      choicesByQuestion.set(qid, new Set());
    }
    choicesByQuestion.get(qid).add(normalizeText(row.choiceText));
  }

  const ids = new Set();
  for (const [questionId, choices] of choicesByQuestion.entries()) {
    if (choices.has('yes') && choices.has('no')) {
      ids.add(questionId);
    }
  }

  return ids;
}

async function ensureMetricRows() {
  const db = getDb();
  for (const metric of CONFIGURABLE_METRICS) {
    const existing = await db
      .select({ id: statisticOverviews.id })
      .from(statisticOverviews)
      .where(eq(statisticOverviews.name, metric.name))
      .get();

    if (!existing) {
      await db.insert(statisticOverviews).values({
        name: metric.name,
        defaultQuestion: metric.defaultQuestion,
        questionId: null
      });
    }
  }
}

async function findReplacementQuestionByText(metricName, questionText) {
  const metric = CONFIGURABLE_METRICS.find((m) => m.name === metricName);
  if (!metric) return null;

  const normalizedTarget = normalizeText(questionText);
  if (!normalizedTarget) return null;

  const db = getDb();
  const matches = await db
    .select({
      id: questions.id,
      text: questions.text,
      answerType: questions.answerType,
      formId: questions.formId
    })
    .from(questions)
    .where(sql`lower(trim(${questions.text})) = ${normalizedTarget}`);

  if (!Array.isArray(matches) || matches.length === 0) return null;

  const yesNoChoiceQuestionIds =
    metric.requirement === 'yes_no_choice' ? await getYesNoChoiceQuestionIds() : new Set();

  const eligible = matches.find((q) =>
    questionMatchesRequirement(q, metric.requirement, yesNoChoiceQuestionIds)
  );

  return eligible || null;
}

export async function listConfigurableOverviewMetrics() {
  await ensureMetricRows();
  const db = getDb();

  const rows = await db
    .select({
      id: statisticOverviews.id,
      name: statisticOverviews.name,
      defaultQuestion: statisticOverviews.defaultQuestion,
      questionId: statisticOverviews.questionId,
      selectedQuestionText: questions.text,
      selectedQuestionAnswerType: questions.answerType,
      selectedFormId: questions.formId,
      selectedFormName: forms.name
    })
    .from(statisticOverviews)
    .leftJoin(questions, eq(questions.id, statisticOverviews.questionId))
    .leftJoin(forms, eq(forms.id, questions.formId));

  for (const row of rows) {
    if (!row.questionId || !row.selectedQuestionText) continue;
    if (normalizeText(row.defaultQuestion) === normalizeText(row.selectedQuestionText)) continue;

    await db
      .update(statisticOverviews)
      .set({ defaultQuestion: row.selectedQuestionText })
      .where(eq(statisticOverviews.id, row.id));

    row.defaultQuestion = row.selectedQuestionText;
  }

  for (const row of rows) {
    if (row.questionId && row.selectedQuestionText) continue;

    const replacement = await findReplacementQuestionByText(row.name, row.defaultQuestion);
    if (!replacement) continue;

    await db
      .update(statisticOverviews)
      .set({ questionId: replacement.id })
      .where(eq(statisticOverviews.id, row.id));

    row.questionId = replacement.id;
    row.selectedQuestionText = replacement.text;
    row.selectedQuestionAnswerType = replacement.answerType;

    const replacementForm = await db
      .select({ id: forms.id, name: forms.name })
      .from(forms)
      .where(eq(forms.id, replacement.formId))
      .get();

    row.selectedFormId = replacement.formId;
    row.selectedFormName = replacementForm?.name || null;
  }

  const byName = new Map(rows.map((r) => [r.name, r]));
  return CONFIGURABLE_METRICS.map((metric) => ({
    ...metric,
    ...(byName.get(metric.name) || {
      id: null,
      questionId: null,
      selectedQuestionText: null,
      selectedQuestionAnswerType: null,
      selectedFormId: null,
      selectedFormName: null,
      defaultQuestion: metric.defaultQuestion
    })
  }));
}

export async function listSelectableSurveyQuestions(metricName) {
  await ensureMetricRows();

  const metric = CONFIGURABLE_METRICS.find((m) => m.name === metricName);
  if (!metric) {
    throw new Error(`Unknown dashboard metric: ${metricName}`);
  }

  const db = getDb();

  const eventTagsAgg = db
    .select({
      eventId: eventTagMappings.eventId,
      tagsCsv: sql`group_concat(${eventTags.name}, ',')`.as('tagsCsv')
    })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTags.id, eventTagMappings.tagId))
    .groupBy(eventTagMappings.eventId)
    .as('event_tags_agg');

  const allForms = await db
    .select({
      id: forms.id,
      name: forms.name,
      provider: forms.provider,
      eventName: events.name,
      tagsCsv: eventTagsAgg.tagsCsv
    })
    .from(forms)
    .leftJoin(events, eq(events.id, forms.eventId))
    .leftJoin(eventTagsAgg, eq(eventTagsAgg.eventId, forms.eventId))
    .orderBy(forms.name);

  const allQuestions = await db
    .select({
      id: questions.id,
      formId: questions.formId,
      text: questions.text,
      answerType: questions.answerType
    })
    .from(questions);

  const yesNoChoiceQuestionIds =
    metric.requirement === 'yes_no_choice' ? await getYesNoChoiceQuestionIds() : new Set();

  const filteredQuestions = allQuestions.filter((question) =>
    questionMatchesRequirement(question, metric.requirement, yesNoChoiceQuestionIds)
  );

  const questionsByForm = new Map();
  for (const question of filteredQuestions) {
    if (!questionsByForm.has(question.formId)) {
      questionsByForm.set(question.formId, []);
    }
    questionsByForm.get(question.formId).push(question);
  }

  return allForms
    .map((form) => ({
      ...form,
      eventName: form.eventName || null,
      eventTags: form.tagsCsv
        ? String(form.tagsCsv)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      questions: (questionsByForm.get(form.id) || []).sort((a, b) =>
        String(a.text).localeCompare(String(b.text))
      )
    }))
    .filter((form) => form.questions.length > 0);
}

export async function setOverviewMetricQuestion(metricName, questionId) {
  await ensureMetricRows();

  const metric = CONFIGURABLE_METRICS.find((m) => m.name === metricName);
  if (!metric) {
    throw new Error(`Unknown dashboard metric: ${metricName}`);
  }

  const numericQuestionId = Number(questionId);
  if (!Number.isInteger(numericQuestionId) || numericQuestionId <= 0) {
    throw new Error('A valid question must be selected');
  }

  const db = getDb();
  const question = await db
    .select({ id: questions.id, text: questions.text, answerType: questions.answerType })
    .from(questions)
    .where(eq(questions.id, numericQuestionId))
    .get();

  if (!question) {
    throw new Error('Selected question was not found');
  }

  if (metric.requirement === 'number' && question.answerType !== 'number') {
    throw new Error('This metric requires a numeric question');
  }

  if (metric.requirement === 'choice' && question.answerType !== 'choice') {
    throw new Error('This metric requires a choice question');
  }

  if (metric.requirement === 'yes_no_choice') {
    if (question.answerType !== 'choice') {
      throw new Error('This metric requires a choice question with Yes/No options');
    }
    const choiceRows = await db
      .select({ choiceText: questionChoice.choiceText })
      .from(questionChoice)
      .where(eq(questionChoice.questionId, question.id));

    const normalized = new Set(choiceRows.map((row) => normalizeText(row.choiceText)));
    if (!normalized.has('yes') || !normalized.has('no')) {
      throw new Error('This metric requires Yes and No choices');
    }
  }

  if (
    metric.requirement === 'choice_or_text' &&
    question.answerType !== 'choice' &&
    question.answerType !== 'text'
  ) {
    throw new Error('This metric requires a choice or text question');
  }

  await db
    .update(statisticOverviews)
    .set({ questionId: question.id, defaultQuestion: question.text })
    .where(eq(statisticOverviews.name, metric.name));

  return {
    ok: true,
    metricName,
    questionId: question.id,
    questionText: question.text
  };
}

export async function getDashboardOverviewData(rawFilters = {}) {
  await ensureMetricRows();

  const db = getDb();
  const filters = normalizeDashboardFilters(rawFilters);
  const submittedAtWhere = buildSubmittedAtWhere(submissions.submittedAt, filters);

  const totalFeedbackRow = await db
    .select({ count: count() })
    .from(submissions)
    .where(submittedAtWhere)
    .get();
  const totalFeedbackReceived = Number(totalFeedbackRow?.count || 0);

  const identifiedRows = await listSubmissionReferenceRows(filters);

  const totalUniqueReferences = new Set();
  let unidentifiedSubmissionCount = 0;
  const yearlyReferenceMap = new Map();
  for (const row of identifiedRows) {
    const referenceId = normalizeReferenceId(row.userReferenceId);
    if (!referenceId) {
      unidentifiedSubmissionCount += 1;
      continue;
    }

    totalUniqueReferences.add(referenceId);

    if (!row.submittedAt) continue;
    const date = new Date(row.submittedAt);
    if (Number.isNaN(date.getTime())) continue;

    const year = String(date.getFullYear());
    if (!yearlyReferenceMap.has(year)) yearlyReferenceMap.set(year, new Set());
    yearlyReferenceMap.get(year).add(referenceId);
  }

  const yearlyServiceUsers = Array.from(yearlyReferenceMap.entries())
    .map(([year, references]) => ({ year, count: references.size }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  const metrics = await listConfigurableOverviewMetrics();

  const metricData = {};

  for (const metric of metrics) {
    if (!metric.questionId || !metric.selectedQuestionText) {
      metricData[metric.name] = {
        configured: false,
        questionText: metric.selectedQuestionText || null
      };
      continue;
    }

    const selectedQuestionTextNormalized = normalizeText(metric.selectedQuestionText);

    const matchingQuestions = await db
      .select({ id: questions.id, answerType: questions.answerType })
      .from(questions)
      .where(sql`lower(trim(${questions.text})) = ${selectedQuestionTextNormalized}`);

    const matchingIds = matchingQuestions.map((q) => q.id);

    if (matchingIds.length === 0) {
      metricData[metric.name] = {
        configured: true,
        questionText: metric.selectedQuestionText,
        valuesFound: 0
      };
      continue;
    }

    const metricResponseConditions = [inArray(responses.questionId, matchingIds)];
    const responsesSubmittedAtWhere = buildSubmittedAtWhere(submissions.submittedAt, filters);
    if (responsesSubmittedAtWhere) metricResponseConditions.push(responsesSubmittedAtWhere);

    const metricResponses = await db
      .select({
        valueText: responses.valueText,
        valueNumber: responses.valueNumber,
        valueChoice: responses.valueChoice
      })
      .from(responses)
      .innerJoin(submissions, eq(submissions.id, responses.submissionId))
      .where(and(...metricResponseConditions));

    if (metric.name === 'avg_satisfaction') {
      const values = metricResponses
        .map((r) => parseNumber(r.valueText, r.valueNumber))
        .filter((v) => v !== null);
      const average =
        values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
      metricData[metric.name] = {
        configured: true,
        questionText: metric.selectedQuestionText,
        valuesFound: values.length,
        average
      };
      continue;
    }

    if (metric.name === 'improved') {
      const normalizedValues = metricResponses
        .map((r) => normalizeText(r.valueChoice || r.valueText))
        .filter((v) => v === 'yes' || v === 'no');

      const yesCount = normalizedValues.filter((v) => v === 'yes').length;
      const total = normalizedValues.length;
      const percent = total > 0 ? (yesCount / total) * 100 : null;

      metricData[metric.name] = {
        configured: true,
        questionText: metric.selectedQuestionText,
        valuesFound: total,
        yesCount,
        total,
        percent
      };
      continue;
    }

    if (metric.name === 'age_distribution') {
      const choiceRows = await db
        .select({ questionId: questionChoice.questionId, choiceText: questionChoice.choiceText })
        .from(questionChoice)
        .where(inArray(questionChoice.questionId, matchingIds));

      const labelByNormalized = new Map();
      const order = [];
      for (const row of choiceRows) {
        const label = String(row.choiceText || '').trim();
        if (!label) continue;
        const key = normalizeText(label);
        if (!labelByNormalized.has(key)) {
          labelByNormalized.set(key, label);
          order.push(key);
        }
      }

      const countsByKey = new Map();
      for (const row of metricResponses) {
        const raw = String(row.valueChoice || row.valueText || '').trim();
        if (!raw) continue;
        const selectedValues = raw
          .split('|')
          .map((part) => part.trim())
          .filter(Boolean);

        for (const selected of selectedValues) {
          const key = normalizeText(selected);
          if (!labelByNormalized.has(key)) {
            labelByNormalized.set(key, selected);
            order.push(key);
          }
          countsByKey.set(key, (countsByKey.get(key) || 0) + 1);
        }
      }

      const bands = order.map((key) => ({
        band: labelByNormalized.get(key),
        count: countsByKey.get(key) || 0
      }));

      metricData[metric.name] = {
        configured: true,
        questionText: metric.selectedQuestionText,
        valuesFound: bands.reduce((sum, item) => sum + item.count, 0),
        bands
      };
      continue;
    }

    if (metric.name === 'referral_sources' || metric.name === 'geographical_distribution') {
      const categoryCounts = new Map();

      for (const row of metricResponses) {
        const value = String(row.valueChoice || row.valueText || '').trim();
        if (!value) continue;
        categoryCounts.set(value, (categoryCounts.get(value) || 0) + 1);
      }

      const categories = Array.from(categoryCounts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name)));

      metricData[metric.name] = {
        configured: true,
        questionText: metric.selectedQuestionText,
        valuesFound: categories.reduce((sum, item) => sum + item.value, 0),
        categories
      };
      continue;
    }

    metricData[metric.name] = {
      configured: true,
      questionText: metric.selectedQuestionText
    };
  }

  return {
    totalFeedbackReceived,
    totalUsers: totalUniqueReferences.size + unidentifiedSubmissionCount,
    totalIdentifiedUsers: totalUniqueReferences.size,
    totalUnidentifiedUsers: unidentifiedSubmissionCount,
    yearlyServiceUsers,
    metricConfig: metrics,
    metricData
  };
}
