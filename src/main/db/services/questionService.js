import { getDb } from '../client';
import { questionChoice, questions } from '../schema';
import { eq } from 'drizzle-orm';

export async function listQuestionsByForm(formId) {
  return getDb().select().from(questions).where(eq(questions.formId, formId));
}

export async function listQuestionsByFormPaginated(formId, offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb().select().from(questions).where(eq(questions.formId, formId));
  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
}

export async function createQuestion(data) {
  const db = getDb();
  const payload =
    typeof data === 'object' && data !== null
      ? data
      : { formId: data, text: '', answerType: 'text' };

  const [{ id }] = await db
    .insert(questions)
    .values({
      formId: payload.formId,
      text: payload.text ?? '',
      answerType: payload.answerType ?? 'text'
    })
    .$returningId();
  const [row] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return [row];
}

export async function listQuestionChoicesByQuestion(questionId) {
  return getDb().select().from(questionChoice).where(eq(questionChoice.questionId, questionId));
}

export async function listQuestionChoicesByQuestionPaginated(questionId, offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb()
    .select()
    .from(questionChoice)
    .where(eq(questionChoice.questionId, questionId));
  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
}

export async function createQuestionChoices(questionId, choices) {
  if (!Array.isArray(choices) || choices.length === 0) return [];

  const seen = new Set();
  const rows = [];
  for (const raw of choices) {
    const text = String(raw ?? '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ questionId, choiceText: text });
  }

  if (rows.length === 0) return [];
  await getDb().insert(questionChoice).values(rows);
  return rows;
}

export async function deleteQuestionChoicesByQuestion(questionId) {
  await getDb().delete(questionChoice).where(eq(questionChoice.questionId, questionId));
  return [];
}

export async function deleteQuestionChoice(id) {
  await getDb().delete(questionChoice).where(eq(questionChoice.id, id));
  return [];
}

export async function deleteQuestion(id, options = {}) {
  const { deleteChoices = true } = options;
  if (deleteChoices) {
    await deleteQuestionChoicesByQuestion(id);
  }
  await getDb().delete(questions).where(eq(questions.id, id));
  return [];
}
