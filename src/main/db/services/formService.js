import {
  getGoogleFormById,
  getGoogleFormResponsesById
} from '../../common/google-forms/google-forms';
import { getDb } from '../client';
import { events, forms, questionChoice, questions, responses, submissions } from '../schema';
import { and, eq, inArray, sql } from 'drizzle-orm';

const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;
const refreshJobsByFormId = new Map();

function serializeSchemaValue(schemaValue) {
  if (schemaValue == null) return null;
  return typeof schemaValue === 'string' ? schemaValue : JSON.stringify(schemaValue);
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

function normalizeSubmissionReferenceText(value) {
  const text = pickText(value).trim();
  return text || null;
}

function pickText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function normalizeQuestionDefinition(def) {
  if (!def || typeof def !== 'object') {
    return {
      questionId: null,
      itemId: null,
      title: '',
      kind: 'unknown',
      options: []
    };
  }

  return {
    questionId: pickText(def.questionId).trim() || null,
    itemId: pickText(def.itemId).trim() || null,
    title: pickText(def.title).trim(),
    kind: pickText(def.kind).trim() || 'unknown',
    options: Array.isArray(def.options)
      ? def.options.map((option) => pickText(option).trim()).filter(Boolean)
      : [],
    scale:
      def.scale && typeof def.scale === 'object'
        ? {
            low: def.scale.low ?? null,
            high: def.scale.high ?? null,
            lowLabel: pickText(def.scale.lowLabel).trim(),
            highLabel: pickText(def.scale.highLabel).trim()
          }
        : null,
    rows: Array.isArray(def.rows)
      ? def.rows.map((row) => pickText(row).trim()).filter(Boolean)
      : [],
    columns: Array.isArray(def.columns)
      ? def.columns.map((column) => pickText(column).trim()).filter(Boolean)
      : []
  };
}

function buildQuestionFingerprint(questionDefs) {
  return JSON.stringify(
    (Array.isArray(questionDefs) ? questionDefs : []).map(normalizeQuestionDefinition)
  );
}

function parseFormSchemaWithFallback(schemaValue) {
  const parsed = parseSchemaValue(schemaValue);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function getRefreshState(schemaValue) {
  const schema = parseFormSchemaWithFallback(schemaValue);
  const refreshState = schema.refreshState;
  return refreshState && typeof refreshState === 'object' ? refreshState : {};
}

function setRefreshStateOnSchema(schemaValue, refreshStatePatch) {
  const schema = parseFormSchemaWithFallback(schemaValue);
  const currentRefreshState =
    schema.refreshState && typeof schema.refreshState === 'object' ? schema.refreshState : {};

  return {
    ...schema,
    refreshState: {
      ...currentRefreshState,
      ...refreshStatePatch
    }
  };
}

function shouldAutoRefreshForm(form) {
  if (!form || form.provider !== 'google_forms') return false;

  const refreshState = getRefreshState(form.schema);
  if (refreshState.accessDenied) {
    return false;
  }

  const lastSuccessAtMs = Date.parse(refreshState.lastSuccessAt || '');
  if (!Number.isFinite(lastSuccessAtMs)) {
    return true;
  }

  return Date.now() - lastSuccessAtMs >= AUTO_REFRESH_INTERVAL_MS;
}

function isGoogleAccessError(error) {
  const code = Number(error?.code ?? error?.status ?? error?.response?.status);
  const message = pickText(error?.message).toLowerCase();

  if ([401, 403, 404].includes(code)) {
    return true;
  }

  return (
    message.includes('permission') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('requested entity was not found') ||
    message.includes('not found') ||
    message.includes('insufficient authentication') ||
    message.includes('failed to obtain google authentication client')
  );
}

async function markFormRefreshState(formId, schemaValue, refreshStatePatch) {
  const nextSchema = setRefreshStateOnSchema(schemaValue, refreshStatePatch);
  await getDb()
    .update(forms)
    .set({ schema: serializeSchemaValue(nextSchema) })
    .where(eq(forms.id, formId));
  return nextSchema;
}

async function withFormRefreshLock(formId, work) {
  const existingJob = refreshJobsByFormId.get(formId);
  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    try {
      return await work();
    } finally {
      refreshJobsByFormId.delete(formId);
    }
  })();

  refreshJobsByFormId.set(formId, job);
  return job;
}
function extractGoogleQuestionDefinitions(form) {
  const items = form?.items || [];
  const out = [];
  for (const it of items) {
    const q = it?.questionItem?.question;
    if (!q) continue;
    const title = pickText(it?.title || q?.questionId || 'Question');
    const def = {
      itemId: it?.itemId ? pickText(it.itemId) : null,
      questionId: q.questionId ? pickText(q.questionId) : null,
      title,
      kind: 'unknown',
      options: []
    };

    if (q.choiceQuestion) {
      def.kind = 'choiceQuestion';
      def.options = (q.choiceQuestion.options || []).map((o) => pickText(o.value));
    } else if (q.textQuestion) {
      def.kind = 'textQuestion';
    } else if (q.scaleQuestion) {
      def.kind = 'scaleQuestion';
      const s = q.scaleQuestion;
      def.scale = {
        low: s.low,
        high: s.high,
        lowLabel: pickText(s.lowLabel),
        highLabel: pickText(s.highLabel)
      };
    } else if (q.ratingQuestion) {
      def.kind = 'ratingQuestion';
    } else if (q.dateQuestion) {
      def.kind = 'dateQuestion';
    } else if (q.timeQuestion) {
      def.kind = 'timeQuestion';
    } else if (q.fileUploadQuestion) {
      def.kind = 'fileUploadQuestion';
    } else if (q.rowQuestion) {
      def.kind = 'gridQuestion';
      const rq = q.rowQuestion;
      def.rows = (rq.rows || []).map((r) => pickText(r.value));
      def.columns = (rq.columns || []).map((c) => pickText(c.value));
    }
    out.push(def);
  }
  return out;
}

function mapGoogleQuestionTypeToAnswerType(questionDef, responses = []) {
  const kind = questionDef?.kind;
  if (kind === 'choiceQuestion') return 'choice';
  if (kind === 'ratingQuestion' || kind === 'scaleQuestion') return 'number';

  // For textQuestion, check if all responses are valid numbers
  if (kind === 'textQuestion' && Array.isArray(responses) && responses.length > 0) {
    const allNumeric = responses.every((resp) => {
      if (!resp) return true; // Empty responses don't disqualify as numeric
      const text = pickText(extractAnswerValue(resp)).trim();
      if (!text) return true; // Empty strings don't disqualify
      const num = Number(text);
      return !Number.isNaN(num) && Number.isFinite(num) && text === String(num);
    });
    if (allNumeric) return 'number';
  }

  return 'text';
}

function getUserReferenceIdFromAnswer(answer) {
  const text = pickText(extractAnswerValue(answer)).trim();
  return text || null;
}

function extractAnswerValue(answer) {
  if (!answer) return '';
  if (answer.textAnswers?.answers?.length) return pickText(answer.textAnswers.answers[0]?.value);
  if (answer.choiceAnswers?.values?.length) return pickText(answer.choiceAnswers.values[0]);
  if (answer.fileUploadAnswers?.answers?.length) {
    const a0 = answer.fileUploadAnswers.answers[0];
    return pickText(a0?.fileId || a0?.fileName || 'file');
  }
  if (answer.dateAnswers?.answers?.length) return JSON.stringify(answer.dateAnswers.answers[0]);
  if (answer.timeAnswers?.answers?.length) return JSON.stringify(answer.timeAnswers.answers[0]);
  return JSON.stringify(answer);
}

function answerToDbValues(answer, answerType) {
  if (!answer) return { valueText: '', valueNumber: null, valueChoice: null };

  if (answerType === 'choice' && answer.choiceAnswers?.values?.length) {
    const joined = answer.choiceAnswers.values
      .map((v) => pickText(v).trim())
      .filter(Boolean)
      .join(' | ');
    if (!joined) return { valueText: '', valueNumber: null, valueChoice: null };
    return { valueText: joined, valueNumber: null, valueChoice: joined };
  }

  const text = pickText(extractAnswerValue(answer)).trim();
  if (!text) return { valueText: '', valueNumber: null, valueChoice: null };

  if (answerType === 'choice') {
    return { valueText: text, valueNumber: null, valueChoice: text };
  }

  if (answerType === 'number') {
    const num = Number(text);
    if (!Number.isNaN(num) && Number.isFinite(num) && text === String(num)) {
      return { valueText: text, valueNumber: num, valueChoice: null };
    }
  }

  return { valueText: text, valueNumber: null, valueChoice: null };
}

function parseSubmittedAt(resp) {
  const t = resp?.lastSubmittedTime || resp?.createTime || resp?.lastModifiedTime;
  const d = t ? new Date(t) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function listForms() {
  await refreshResponsesAndSchemaForAllGoogleForms();
  return getDb().select().from(forms);
}

export async function findFormById(id) {
  await refreshSchemaAndResponses(id, { force: false });
  const [row] = await getDb().select().from(forms).where(eq(forms.id, id)).limit(1);
  return row ?? null;
}

export async function listFormWithEventNameAndResponseCount() {
  await refreshResponsesAndSchemaForAllGoogleForms();
  const db = getDb();
  const result = await db
    .select({
      id: forms.id,
      name: forms.name,
      provider: forms.provider,
      baseLink: forms.baseLink,
      externalId: forms.externalId,
      eventId: forms.eventId,
      schema: forms.schema,
      eventName: events.name,
      responseCount: db.$count(submissions, eq(submissions.formId, forms.id))
    })
    .from(forms)
    .leftJoin(events, eq(events.id, forms.eventId));

  const safeJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  return result.map((form) => ({
    ...form,
    schema: form.schema ? safeJsonParse(form.schema) : form.schema
  }));
}

export async function listFormsByEvent(eventId) {
  await refreshResponsesAndSchemaForAllGoogleForms();
  return getDb().select().from(forms).where(eq(forms.eventId, eventId));
}

async function syncQuestionChoices(db, questionId, options) {
  await db.delete(questionChoice).where(eq(questionChoice.questionId, questionId));

  const seen = new Set();
  const optionRows = [];
  for (const rawOption of Array.isArray(options) ? options : []) {
    const optionText = pickText(rawOption).trim();
    if (!optionText) continue;
    const key = optionText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    optionRows.push({ questionId, choiceText: optionText });
  }

  if (optionRows.length > 0) {
    await db.insert(questionChoice).values(optionRows);
  }
}

async function rebuildQuestionsForForm(db, formId, questionDefs, responsesByQuestionDef) {
  const existingQuestions = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.formId, formId));

  await db.delete(submissions).where(eq(submissions.formId, formId));
  for (const q of existingQuestions) {
    await db.delete(questionChoice).where(eq(questionChoice.questionId, q.id));
  }
  await db.delete(questions).where(eq(questions.formId, formId));

  const questionRows = [];
  for (let i = 0; i < questionDefs.length; i++) {
    const def = questionDefs[i];
    const answerType = mapGoogleQuestionTypeToAnswerType(def, responsesByQuestionDef[i]);
    const [{ id: questionId }] = await db
      .insert(questions)
      .values({
        formId,
        text: def.title,
        answerType
      })
      .$returningId();

    if (answerType === 'choice') {
      await syncQuestionChoices(db, questionId, def.options);
    }

    questionRows.push({
      id: questionId,
      formId,
      text: def.title,
      answerType,
      googleQuestionId: def.questionId,
      questionIndex: i
    });
  }

  return questionRows;
}

async function reuseExistingQuestionsForForm(db, formId, questionDefs, responsesByQuestionDef) {
  const existingQuestionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.formId, formId));
  const sortedRows = [...existingQuestionRows].sort(
    (left, right) => Number(left.id) - Number(right.id)
  );

  const questionRows = [];
  for (let i = 0; i < questionDefs.length; i++) {
    const def = questionDefs[i];
    const existingRow = sortedRows[i];
    const answerType = mapGoogleQuestionTypeToAnswerType(def, responsesByQuestionDef[i]);

    if (!existingRow) {
      throw new Error(`Missing question row for form ${formId} at position ${i}`);
    }

    if (existingRow.text !== def.title || existingRow.answerType !== answerType) {
      await db
        .update(questions)
        .set({ text: def.title, answerType })
        .where(eq(questions.id, existingRow.id));
    }

    if (answerType === 'choice') {
      await syncQuestionChoices(db, existingRow.id, def.options);
    } else {
      await db.delete(questionChoice).where(eq(questionChoice.questionId, existingRow.id));
    }

    questionRows.push({
      ...existingRow,
      text: def.title,
      answerType,
      googleQuestionId: def.questionId,
      questionIndex: i
    });
  }

  return questionRows;
}

async function upsertSubmissionForForm(db, formId, response, userReferenceId) {
  const externalResponseId = pickText(response?.responseId || '').trim();
  if (!externalResponseId) {
    return null;
  }

  const submittedAt = parseSubmittedAt(response);

  await db
    .insert(submissions)
    .values({
      formId,
      userReferenceId,
      submittedAt,
      externalId: externalResponseId
    })
    .onDuplicateKeyUpdate({
      set: {
        userReferenceId,
        submittedAt
      }
    });

  const [submissionRow] = await db
    .select({ id: submissions.id, externalId: submissions.externalId })
    .from(submissions)
    .where(and(eq(submissions.formId, formId), eq(submissions.externalId, externalResponseId)))
    .limit(1);

  return submissionRow ?? null;
}

async function syncResponsesForForm(db, formId, questionRows, googleResponses, referenceQuestion) {
  const seenExternalIds = new Set();

  for (const response of googleResponses?.responses || []) {
    const answersObj = response?.answers || {};
    const answerValuesByIndex = Object.values(answersObj);
    const userReferenceAnswer = referenceQuestion
      ? referenceQuestion.googleQuestionId
        ? answersObj[referenceQuestion.googleQuestionId] || null
        : answerValuesByIndex[referenceQuestion.questionIndex] || null
      : null;
    const userReferenceId = getUserReferenceIdFromAnswer(userReferenceAnswer);

    const submissionRow = await upsertSubmissionForForm(db, formId, response, userReferenceId);
    if (!submissionRow) continue;

    seenExternalIds.add(submissionRow.externalId);

    for (let i = 0; i < questionRows.length; i++) {
      const question = questionRows[i];
      const answer = question.googleQuestionId
        ? answersObj[question.googleQuestionId] || null
        : answerValuesByIndex[i] || null;
      const vals = answerToDbValues(answer, question.answerType);

      await db
        .insert(responses)
        .values({
          submissionId: submissionRow.id,
          questionId: question.id,
          valueText: vals.valueText,
          valueNumber: vals.valueNumber,
          valueChoice: vals.valueChoice
        })
        .onDuplicateKeyUpdate({
          set: {
            valueText: vals.valueText,
            valueNumber: vals.valueNumber,
            valueChoice: vals.valueChoice
          }
        });
    }
  }

  const existingSubmissionRows = await db
    .select({ id: submissions.id, externalId: submissions.externalId })
    .from(submissions)
    .where(eq(submissions.formId, formId));

  const staleSubmissionIds = existingSubmissionRows
    .filter((row) => !seenExternalIds.has(row.externalId))
    .map((row) => row.id);

  if (staleSubmissionIds.length > 0) {
    await db.delete(submissions).where(inArray(submissions.id, staleSubmissionIds));
  }
}

async function performGoogleFormRefresh(form) {
  const formId = Number(form.id);
  const currentSchema = parseFormSchemaWithFallback(form.schema);
  const googleFormId = pickText(form.externalId).trim();

  if (!googleFormId) {
    throw new Error(`Form with id ${formId} does not have an externalId`);
  }

  let configuredReferenceQuestionId = '';
  try {
    configuredReferenceQuestionId = pickText(currentSchema?.userReferenceQuestionId).trim();
  } catch {
    configuredReferenceQuestionId = '';
  }

  const refreshAttemptAt = new Date().toISOString();

  try {
    const [googleFormRes, googleResponses] = await Promise.all([
      getGoogleFormById(googleFormId),
      getGoogleFormResponsesById(googleFormId)
    ]);

    const googleForm = googleFormRes?.data || googleFormRes;
    const questionDefs = extractGoogleQuestionDefinitions(googleForm);
    const responsesByQuestionDef = {};
    for (let i = 0; i < questionDefs.length; i++) {
      responsesByQuestionDef[i] = [];
    }

    for (const response of googleResponses?.responses || []) {
      const answersObj = response?.answers || {};
      const answerValuesByIndex = Object.values(answersObj);

      for (let i = 0; i < questionDefs.length; i++) {
        const def = questionDefs[i];
        const answer = def.questionId
          ? answersObj[def.questionId] || null
          : answerValuesByIndex[i] || null;

        if (answer) {
          responsesByQuestionDef[i].push(answer);
        }
      }
    }

    const nextQuestionFingerprint = buildQuestionFingerprint(questionDefs);
    const currentQuestionFingerprint = buildQuestionFingerprint(currentSchema.questions);

    const result = await getDb().transaction(async (tx) => {
      const questionRows =
        nextQuestionFingerprint === currentQuestionFingerprint &&
        Array.isArray(currentSchema.questions) &&
        currentSchema.questions.length === questionDefs.length
          ? await reuseExistingQuestionsForForm(tx, formId, questionDefs, responsesByQuestionDef)
          : await rebuildQuestionsForForm(tx, formId, questionDefs, responsesByQuestionDef);

      const referenceQuestion = configuredReferenceQuestionId
        ? questionRows.find((q) => q.googleQuestionId === configuredReferenceQuestionId) || null
        : null;

      const schema = {
        ...currentSchema,
        source: 'google_forms',
        googleFormId,
        userReferenceQuestionId: configuredReferenceQuestionId || null,
        userReferenceQuestionDbId: referenceQuestion?.id || null,
        title: pickText(googleForm?.info?.title || form.name),
        questionHeaders: questionDefs.map((d) => d.title),
        questions: questionDefs,
        refreshState: {
          ...(currentSchema.refreshState && typeof currentSchema.refreshState === 'object'
            ? currentSchema.refreshState
            : {}),
          lastAttemptAt: refreshAttemptAt,
          lastSuccessAt: refreshAttemptAt,
          lastErrorAt: null,
          lastErrorMessage: null,
          accessDenied: false
        }
      };

      await tx
        .update(forms)
        .set({ schema: serializeSchemaValue(schema) })
        .where(eq(forms.id, formId));

      await syncResponsesForForm(tx, formId, questionRows, googleResponses, referenceQuestion);

      return {
        formId,
        refreshed: true,
        skipped: false,
        accessDenied: false,
        questionCount: questionRows.length,
        responseCount: Array.isArray(googleResponses?.responses)
          ? googleResponses.responses.length
          : 0
      };
    });

    return result;
  } catch (error) {
    if (!isGoogleAccessError(error)) {
      throw error;
    }

    await markFormRefreshState(formId, form.schema, {
      lastAttemptAt: refreshAttemptAt,
      lastErrorAt: refreshAttemptAt,
      lastErrorMessage: pickText(error?.message).trim() || 'Unable to access Google Form',
      accessDenied: true
    });

    return {
      formId,
      refreshed: false,
      skipped: true,
      accessDenied: true,
      reason: 'google-access-denied'
    };
  }
}

export async function createForm(data) {
  const db = getDb();
  const [{ id }] = await db
    .insert(forms)
    .values({
      name: data.name,
      provider: data.provider,
      baseLink: data.baseLink,
      externalId: data.externalId,
      eventId: data.eventId,
      schema: serializeSchemaValue(data.schema)
    })
    .$returningId();
  const [row] = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return [row];
}

export async function deleteForm(id) {
  await getDb().delete(forms).where(eq(forms.id, id));
  return [];
}

export async function updateForm(id, data) {
  const db = getDb();
  const formId = Number(id);
  if (!Number.isInteger(formId) || formId <= 0) {
    throw new Error(`Invalid form id: ${id}`);
  }

  const payload = data && typeof data === 'object' ? data : {};
  const [existingForm] = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);
  if (!existingForm) {
    throw new Error(`Form with id ${formId} not found`);
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.provider !== undefined) updateData.provider = payload.provider;
  if (payload.baseLink !== undefined) updateData.baseLink = payload.baseLink;
  if (payload.externalId !== undefined) updateData.externalId = payload.externalId;
  if (payload.eventId !== undefined) updateData.eventId = payload.eventId;
  if (payload.schema !== undefined) {
    updateData.schema = serializeSchemaValue(payload.schema);
  }

  let referenceQuestion = null;
  let normalizeReferenceQuestionId = null;
  if (payload.userReferenceQuestionId !== undefined) {
    const maybeId = Number(payload.userReferenceQuestionId);
    if (Number.isInteger(maybeId) && maybeId > 0) {
      normalizeReferenceQuestionId = maybeId;
      referenceQuestion =
        (
          await db
            .select({ id: questions.id, text: questions.text, answerType: questions.answerType })
            .from(questions)
            .where(and(eq(questions.id, maybeId), eq(questions.formId, formId)))
            .limit(1)
        )[0] ?? null;

      if (!referenceQuestion) {
        throw new Error('Selected reference ID question does not belong to this survey');
      }

      if (referenceQuestion.answerType !== 'text') {
        throw new Error('Reference ID question must be a text question');
      }
    }

    const currentSchema =
      parseSchemaValue(payload.schema !== undefined ? payload.schema : existingForm.schema) || {};

    let googleReferenceQuestionId = null;
    if (normalizeReferenceQuestionId != null && Array.isArray(currentSchema.questions)) {
      const normalizedTarget = pickText(referenceQuestion?.text).trim().toLowerCase();
      const matched = currentSchema.questions.find((q) => {
        const title = pickText(q?.title).trim().toLowerCase();
        return title && title === normalizedTarget;
      });
      googleReferenceQuestionId = pickText(matched?.questionId).trim() || null;
    }

    updateData.schema = serializeSchemaValue({
      ...currentSchema,
      userReferenceQuestionDbId: normalizeReferenceQuestionId,
      userReferenceQuestionId: googleReferenceQuestionId
    });
  }

  const hasFormUpdates = Object.keys(updateData).length > 0;
  let updatedRows;
  if (hasFormUpdates) {
    await db.update(forms).set(updateData).where(eq(forms.id, formId));
    const [updated] = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);
    updatedRows = [updated];
  } else {
    updatedRows = [existingForm];
  }

  if (payload.userReferenceQuestionId !== undefined) {
    await db.execute(
      sql`UPDATE submissions SET user_reference_id = NULL WHERE form_id = ${formId}`
    );

    if (normalizeReferenceQuestionId != null) {
      const submissionRows = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.formId, formId));

      const submissionIds = submissionRows.map((row) => row.id);
      if (submissionIds.length > 0) {
        const referenceResponses = await db
          .select({
            submissionId: responses.submissionId,
            valueText: responses.valueText
          })
          .from(responses)
          .where(
            and(
              eq(responses.questionId, normalizeReferenceQuestionId),
              inArray(responses.submissionId, submissionIds)
            )
          );

        for (const row of referenceResponses) {
          const referenceText = normalizeSubmissionReferenceText(row.valueText);
          if (!referenceText) continue;
          await db.execute(
            sql`UPDATE submissions SET user_reference_id = ${referenceText} WHERE id = ${row.submissionId}`
          );
        }
      }
    }
  }

  return updatedRows;
}

export async function refreshSchemaAndResponses(formId, options = {}) {
  return withFormRefreshLock(Number(formId), async () => {
    const [form] = await getDb().select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) {
      throw new Error(`Form with id ${formId} not found`);
    }

    if (form.provider !== 'google_forms') {
      return { formId: Number(formId), refreshed: false, skipped: true, reason: 'not-google-form' };
    }

    const force = Boolean(options?.force);
    if (!force && !shouldAutoRefreshForm(form)) {
      return { formId: Number(formId), refreshed: false, skipped: true, reason: 'fresh-enough' };
    }

    return performGoogleFormRefresh(form);
  });
}

export async function refreshResponsesAndSchemaForAllGoogleForms() {
  const googleForms = await getDb().select().from(forms).where(eq(forms.provider, 'google_forms'));

  const results = [];
  for (const form of googleForms) {
    if (!shouldAutoRefreshForm(form)) {
      results.push({ formId: form.id, refreshed: false, skipped: true, reason: 'fresh-enough' });
      continue;
    }

    results.push(await refreshSchemaAndResponses(form.id));
  }

  return {
    refreshedFormIds: results.filter((result) => result?.refreshed).map((result) => result.formId),
    skippedFormIds: results.filter((result) => result?.skipped).map((result) => result.formId),
    results
  };
}
