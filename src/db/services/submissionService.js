import { db } from '../client'
import { submissions } from '../schema'
import { eq } from 'drizzle-orm'

export async function listSubmissionsByForm(formId) {
  return db.select().from(submissions).where(eq(submissions.formId, formId))
}

export async function createSubmission(data) {
  return db
    .insert(submissions)
    .values({
      formId: data.formId,
      submittedAt: data.submittedAt,
      externalId: data.externalId
    })
    .returning()
}

export async function deleteSubmission(id) {
  return db.delete(submissions).where(eq(submissions.id, id)).returning()
}
