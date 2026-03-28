import * as eventService from '../db/services/eventService.js';
import * as formService from '../db/services/formService.js';
import * as questionService from '../db/services/questionService.js';
import * as submissionService from '../db/services/submissionService.js';
import * as responseService from '../db/services/responseService.js';
import { getGoogleFormById, getGoogleFormResponsesById } from '../common/google-forms/google-forms.js';

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
      questionId: q.questionId ? pickText(q.questionId) : null,
      title,
      type: 'unknown',
      options: []
    };
    if (q.choiceQuestion) {
      const cq = q.choiceQuestion;
      const t = String(cq.type || 'RADIO').toLowerCase();
      if (t === 'checkbox') def.type = 'checkbox';
      else if (t === 'drop_down') def.type = 'dropdown';
      else def.type = 'radio';
      def.options = (cq.options || []).map((o) => pickText(o.value));
    } else if (q.textQuestion) {
      def.type = q.textQuestion.paragraph ? 'paragraph' : 'text';
    } else if (q.scaleQuestion) {
      const s = q.scaleQuestion;
      def.type = 'scale';
      def.scale = {
        low: s.low,
        high: s.high,
        lowLabel: pickText(s.lowLabel),
        highLabel: pickText(s.highLabel)
      };
    } else if (q.dateQuestion) {
      def.type = 'date';
    } else if (q.timeQuestion) {
      def.type = 'time';
    } else if (q.fileUploadQuestion) {
      def.type = 'file_upload';
    } else if (q.rowQuestion) {
      const rq = q.rowQuestion;
      def.type = 'grid';
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

function valueToDb(text) {
  const s = pickText(text).trim();
  if (!s) return { valueText: '', valueNumber: null, valueChoice: null };
  const num = Number(s);
  if (!Number.isNaN(num) && Number.isFinite(num) && s === String(num)) {
    return { valueText: s, valueNumber: num, valueChoice: null };
  }
  return { valueText: s, valueNumber: null, valueChoice: null };
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

export async function importGoogleForms(formIds, { eventName, eventDescription, formNameOverride } = {}) {
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

    const questionRows = [];
    for (let i = 0; i < questionDefs.length; i++) {
      questionRows.push((await questionService.createQuestion(dbForm.id))[0]);
    }

    // import responses (best-effort)
    const responseData = await getGoogleFormResponsesById(formId);
    const responses = responseData?.responses || [];
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

      // Google Forms answers are keyed by questionId; we don't persist questionId,
      // so we just map in order we created questions and store whatever we can.
      const answersObj = r?.answers || {};
      const answerValues = Object.values(answersObj).map(extractAnswerValue);

      for (let i = 0; i < questionRows.length; i++) {
        const text = answerValues[i] ?? '';
        const vals = valueToDb(text);
        await responseService.upsertResponse({
          submissionId: sub.id,
          questionId: questionRows[i].id,
          ...vals
        });
      }
    }

    createdFormIds.push(dbForm.id);
  }

  return { formIds: createdFormIds };
}

