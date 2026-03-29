import { getDb } from '../client';
import { questionChoice, questions } from '../schema';
import { eq } from 'drizzle-orm';

export async function listQuestionsByForm(formId) {
  return getDb().select().from(questions).where(eq(questions.formId, formId));
}

export async function createQuestion(data) {
  const payload =
    typeof data === 'object' && data !== null
      ? data
      : { formId: data, text: '', answerType: 'text' };

  return getDb()
    .insert(questions)
    .values({
      formId: payload.formId,
      text: payload.text ?? '',
      answerType: payload.answerType ?? 'text'
    })
    .returning();
}

export async function listQuestionChoicesByQuestion(questionId) {
  return getDb().select().from(questionChoice).where(eq(questionChoice.questionId, questionId));
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
  return getDb().insert(questionChoice).values(rows).returning();
}

export async function deleteQuestionChoicesByQuestion(questionId) {
  return getDb()
    .delete(questionChoice)
    .where(eq(questionChoice.questionId, questionId))
    .returning();
}

export async function deleteQuestionChoice(id) {
  return getDb().delete(questionChoice).where(eq(questionChoice.id, id)).returning();
}

export async function deleteQuestion(id, options = {}) {
  const { deleteChoices = true } = options;
  if (deleteChoices) {
    await deleteQuestionChoicesByQuestion(id);
  }
  return getDb().delete(questions).where(eq(questions.id, id)).returning();
}
