import { getDb } from '../client';
import { submissions } from '../schema';
import { count, eq } from 'drizzle-orm';

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

export async function countAllSubmissions() {
  const result = await getDb().select({ count: count() }).from(submissions);

  return result[0]?.count ?? 0;
}

export async function listSubmissionsByForm(formId) {
  return getDb().select().from(submissions).where(eq(submissions.formId, formId));
}

export async function createSubmission(data) {
  return getDb()
    .insert(submissions)
    .values({
      formId: data.formId,
      userReferenceId: optionalText(data.userReferenceId),
      submittedAt: data.submittedAt,
      externalId: data.externalId
    })
    .returning();
}

export async function deleteSubmission(id) {
  return getDb().delete(submissions).where(eq(submissions.id, id)).returning();
}
