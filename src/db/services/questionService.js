import { getDb } from '../client';
import { questions } from '../schema';
import { eq } from 'drizzle-orm';

export async function listQuestionsByForm(formId) {
  return getDb().select().from(questions).where(eq(questions.formId, formId));
}

export async function createQuestion(formId) {
  return getDb().insert(questions).values({ formId }).returning();
}

export async function deleteQuestion(id) {
  return getDb().delete(questions).where(eq(questions.id, id)).returning();
}
