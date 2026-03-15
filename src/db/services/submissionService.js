import { getDb } from '../client';
import { submissions } from '../schema';
import { eq } from 'drizzle-orm';

export async function listSubmissionsByForm(formId) {
  return getDb().select().from(submissions).where(eq(submissions.formId, formId));
}

export async function createSubmission(data) {
  return getDb()
    .insert(submissions)
    .values({
      formId: data.formId,
      submittedAt: data.submittedAt,
      externalId: data.externalId
    })
    .returning();
}

export async function deleteSubmission(id) {
  return getDb().delete(submissions).where(eq(submissions.id, id)).returning();
}
