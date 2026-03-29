import {
  getGoogleFormById,
  getGoogleFormResponsesById
} from '../../common/google-forms/google-forms';
import { getDb } from '../client';
import { events, forms, questionChoice, questions, responses, submissions } from '../schema';
import { eq } from 'drizzle-orm';

function serializeSchemaValue(schemaValue) {
  if (schemaValue == null) return null;
  return typeof schemaValue === 'string' ? schemaValue : JSON.stringify(schemaValue);
}

function pickText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return String(v);
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
  await refreshSchemaAndResponses(id);
  return getDb().select().from(forms).where(eq(forms.id, id)).get();
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

export async function createForm(data) {
  return getDb()
    .insert(forms)
    .values({
      name: data.name,
      provider: data.provider,
      baseLink: data.baseLink,
      externalId: data.externalId,
      eventId: data.eventId,
      schema: serializeSchemaValue(data.schema)
    })
    .returning();
}

export async function deleteForm(id) {
  return getDb().delete(forms).where(eq(forms.id, id)).returning();
}

export async function updateForm(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.provider !== undefined) updateData.provider = data.provider;
  if (data.baseLink !== undefined) updateData.baseLink = data.baseLink;
  if (data.externalId !== undefined) updateData.externalId = data.externalId;
  if (data.eventId !== undefined) updateData.eventId = data.eventId;
  if (data.schema !== undefined) updateData.schema = serializeSchemaValue(data.schema);

  return getDb().update(forms).set(updateData).where(eq(forms.id, id)).returning();
}

export async function refreshSchemaAndResponses(formId) {
  const form = await getDb().select().from(forms).where(eq(forms.id, formId)).get();
  if (!form) {
    throw new Error(`Form with id ${formId} not found`);
  }

  if (form.provider === 'google_forms') {
    const { externalId } = form;
    if (!externalId) {
      throw new Error(`Form with id ${formId} does not have an externalId`);
    }

    const googleFormRes = await getGoogleFormById(externalId);
    const googleForm = googleFormRes?.data || googleFormRes;
    const googleResponses = await getGoogleFormResponsesById(externalId);
    const questionDefs = extractGoogleQuestionDefinitions(googleForm);

    const schema = {
      source: 'google_forms',
      googleFormId: externalId,
      title: pickText(googleForm?.info?.title || form.name),
      questionHeaders: questionDefs.map((d) => d.title),
      questions: questionDefs
    };

    const db = getDb();
    await db
      .update(forms)
      .set({ schema: serializeSchemaValue(schema) })
      .where(eq(forms.id, formId));

    const existingQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.formId, formId));

    await db.delete(submissions).where(eq(submissions.formId, formId));
    for (const q of existingQuestions) {
      await db.delete(questionChoice).where(eq(questionChoice.questionId, q.id));
    }
    await db.delete(questions).where(eq(questions.formId, formId));

    // First pass: collect responses by question definition to determine answer types
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

    const questionRows = [];
    for (let i = 0; i < questionDefs.length; i++) {
      const def = questionDefs[i];
      const answerType = mapGoogleQuestionTypeToAnswerType(def, responsesByQuestionDef[i]);
      const [questionRow] = await db
        .insert(questions)
        .values({
          formId,
          text: def.title,
          answerType
        })
        .returning();

      if (answerType === 'choice' && Array.isArray(def.options) && def.options.length > 0) {
        const seen = new Set();
        const optionRows = [];
        for (const rawOption of def.options) {
          const optionText = pickText(rawOption).trim();
          if (!optionText) continue;
          const key = optionText.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          optionRows.push({ questionId: questionRow.id, choiceText: optionText });
        }
        if (optionRows.length > 0) {
          await db.insert(questionChoice).values(optionRows);
        }
      }

      questionRows.push({
        ...questionRow,
        googleQuestionId: def.questionId,
        answerType
      });
    }

    for (const response of googleResponses?.responses || []) {
      const externalResponseId = pickText(response?.responseId || '').trim();
      if (!externalResponseId) continue;

      const [submission] = await db
        .insert(submissions)
        .values({
          formId,
          submittedAt: parseSubmittedAt(response),
          externalId: externalResponseId
        })
        .returning();

      const answersObj = response?.answers || {};
      const answerValuesByIndex = Object.values(answersObj);

      for (let i = 0; i < questionRows.length; i++) {
        const question = questionRows[i];
        const answer = question.googleQuestionId
          ? answersObj[question.googleQuestionId] || null
          : answerValuesByIndex[i] || null;

        const vals = answerToDbValues(answer, question.answerType);
        await db.insert(responses).values({
          submissionId: submission.id,
          questionId: question.id,
          valueText: vals.valueText,
          valueNumber: vals.valueNumber,
          valueChoice: vals.valueChoice
        });
      }
    }
  }
}

export async function refreshResponsesAndSchemaForAllGoogleForms() {
  const googleForms = await getDb().select().from(forms).where(eq(forms.provider, 'google_forms'));

  for (const form of googleForms) {
    await refreshSchemaAndResponses(form.id);
  }

  return { refreshedFormIds: googleForms.map((form) => form.id) };
}
