import { getDb } from '../client'
import { responses } from '../schema'
import { eq } from 'drizzle-orm'

export async function listResponsesBySubmission(submissionId) {
  return getDb().select().from(responses).where(eq(responses.submissionId, submissionId))
}

export async function upsertResponse(data) {
  return getDb()
    .insert(responses)
    .values({
      submissionId: data.submissionId,
      questionId: data.questionId,
      valueText: data.valueText ?? null,
      valueNumber: data.valueNumber ?? null,
      valueChoice: data.valueChoice ?? null
    })
    .onConflictDoUpdate({
      target: [responses.submissionId, responses.questionId],
      set: {
        valueText: data.valueText ?? null,
        valueNumber: data.valueNumber ?? null,
        valueChoice: data.valueChoice ?? null
      }
    })
    .returning()
}

export async function deleteResponse(id) {
  return getDb().delete(responses).where(eq(responses.id, id)).returning()
}
