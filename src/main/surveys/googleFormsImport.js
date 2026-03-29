import * as eventService from '../db/services/eventService.js';
import * as formService from '../db/services/formService.js';
import * as questionService from '../db/services/questionService.js';
import * as submissionService from '../db/services/submissionService.js';
import * as responseService from '../db/services/responseService.js';
import {
  getGoogleFormById,
  getGoogleFormResponsesById
} from '../common/google-forms/google-forms.js';

function pickText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

/** Pull titles + types + all defined choices from the live Google Form (unused choices included). */
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
      const s = q.scaleQuestion;
      def.kind = 'scaleQuestion';
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
      const rq = q.rowQuestion;
      def.kind = 'gridQuestion';
      def.rows = (rq.rows || []).map((r) => pickText(r.value));
      def.columns = (rq.columns || []).map((c) => pickText(c.value));
    }
    out.push(def);
  }
  return out;
}

function extractAnswerValue(answer) {
  if (!answer) return '';
  if (answer.textAnswers?.answers?.length) return pickText(answer.textAnswers.answers[0]?.value);
  if (answer.choiceAnswers?.values?.length) return pickText(answer.choiceAnswers.values[0]);
  if (answer.fileUploadAnswers?.answers?.length) {
    const a0 = answer.fileUploadAnswers.answers[0];
    return pickText(a0?.fileId || a0?.fileName || 'file');
  }
  if (answer.dateAnswers?.answers?.length) {
    const a0 = answer.dateAnswers.answers[0];
    return JSON.stringify(a0);
  }
  if (answer.timeAnswers?.answers?.length) {
    const a0 = answer.timeAnswers.answers[0];
    return JSON.stringify(a0);
  }
  return JSON.stringify(answer);
}

function parseSubmittedAt(resp) {
  const t = resp?.lastSubmittedTime || resp?.createTime || resp?.lastModifiedTime;
  const d = t ? new Date(t) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
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

async function ensureEventByName(name, description) {
  const n = (name || '').trim();
  if (!n) throw new Error('Event name is required');
  const all = await eventService.listEvents();
  let ev = all.find((e) => e.name === n);
  if (!ev) ev = (await eventService.createEvent({ name: n, description: description || null }))[0];
  return ev;
}

async function uniqueFormName(base) {
  const existing = await formService.listForms();
  const taken = new Set(existing.map((f) => f.name));
  const b = (base || 'Imported Survey').trim() || 'Imported Survey';
  let name = b;
  let i = 2;
  while (taken.has(name)) {
    name = `${b} (${i})`;
    i++;
  }
  return name;
}

export async function importGoogleForms(
  formIds,
  { eventName, eventDescription, formNameOverride } = {}
) {
  if (!Array.isArray(formIds) || formIds.length === 0) throw new Error('No forms selected');
  const ev = await ensureEventByName(eventName, eventDescription);

  const createdFormIds = [];
  const override = (formNameOverride || '').trim();
  const multiple = formIds.length > 1;

  for (const formId of formIds) {
    const gFormRes = await getGoogleFormById(formId);
    const gForm = gFormRes?.data || gFormRes;
    const googleTitle = (gForm?.info?.title || '').trim();
    const fallbackTitle = googleTitle || 'Imported Google Form';

    let baseForName;
    if (override) {
      baseForName = multiple ? `${override} (${fallbackTitle})` : override;
    } else {
      baseForName = fallbackTitle;
    }
    const name = await uniqueFormName(baseForName);

    const questionDefs = extractGoogleQuestionDefinitions(gForm);
    const schema = JSON.stringify({
      source: 'google_forms',
      googleFormId: formId,
      title: googleTitle || name,
      questionHeaders: questionDefs.map((d) => d.title),
      questions: questionDefs
    });

    const [dbForm] = await formService.createForm({
      name,
      provider: 'google_forms',
      baseLink: `https://docs.google.com/forms/d/${formId}/viewform`,
      externalId: formId,
      eventId: ev.id,
      schema
    });

    // Collect responses first to determine answer types
    const responseData = await getGoogleFormResponsesById(formId);
    const responses = responseData?.responses || [];

    const responsesByQuestionDef = {};
    for (let i = 0; i < questionDefs.length; i++) {
      responsesByQuestionDef[i] = [];
    }

    for (const r of responses) {
      const answersObj = r?.answers || {};
      const answerEntries = Object.entries(answersObj);
      const answerValuesByIndex = answerEntries.map(([, value]) => value);

      for (let i = 0; i < questionDefs.length; i++) {
        const def = questionDefs[i];
        const answer =
          def.questionId && answersObj[def.questionId]
            ? answersObj[def.questionId]
            : (answerValuesByIndex[i] ?? null);

        if (answer) {
          responsesByQuestionDef[i].push(answer);
        }
      }
    }

    const questionRows = [];
    for (let i = 0; i < questionDefs.length; i++) {
      const def = questionDefs[i];
      const answerType = mapGoogleQuestionTypeToAnswerType(def, responsesByQuestionDef[i]);
      const [questionRow] = await questionService.createQuestion({
        formId: dbForm.id,
        text: def.title,
        answerType
      });

      if (answerType === 'choice' && Array.isArray(def.options) && def.options.length > 0) {
        await questionService.createQuestionChoices(questionRow.id, def.options);
      }

      questionRows.push({
        ...questionRow,
        googleQuestionId: def.questionId,
        answerType
      });
    }

    // import responses (best-effort)
    const existingSubs = await submissionService.listSubmissionsByForm(dbForm.id);
    const existingByExternalId = new Set(existingSubs.map((s) => s.externalId));

    for (const r of responses) {
      const externalId = pickText(r.responseId || r.response_id || '');
      if (!externalId) continue;
      if (existingByExternalId.has(externalId)) continue;

      const [sub] = await submissionService.createSubmission({
        formId: dbForm.id,
        submittedAt: parseSubmittedAt(r),
        externalId
      });

      const answersObj = r?.answers || {};
      const answerEntries = Object.entries(answersObj);
      const answerValuesByIndex = answerEntries.map(([, value]) => value);

      for (let i = 0; i < questionRows.length; i++) {
        const question = questionRows[i];
        let answer = null;

        if (question.googleQuestionId && answersObj[question.googleQuestionId]) {
          answer = answersObj[question.googleQuestionId];
        } else {
          answer = answerValuesByIndex[i] ?? null;
        }

        const vals = answerToDbValues(answer, question.answerType);
        await responseService.upsertResponse({
          submissionId: sub.id,
          questionId: question.id,
          ...vals
        });
      }
    }

    createdFormIds.push(dbForm.id);
  }

  return { formIds: createdFormIds };
}
