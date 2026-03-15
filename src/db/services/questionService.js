import { db } from '../client'
import { questions } from '../schema'
import { eq } from 'drizzle-orm'

export async function listQuestionsByForm(formId) {
  return db.select().from(questions).where(eq(questions.formId, formId))
}

export async function createQuestion(formId) {
  return db.insert(questions).values({ formId }).returning()
}

export async function deleteQuestion(id) {
  return db.delete(questions).where(eq(questions.id, id)).returning()
}
