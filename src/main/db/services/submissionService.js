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
  const db = getDb();
  const [{ id }] = await db
    .insert(submissions)
    .values({
      formId: data.formId,
      userReferenceId: optionalText(data.userReferenceId),
      submittedAt: data.submittedAt,
      externalId: data.externalId
    })
    .$returningId();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return [row];
}

export async function deleteSubmission(id) {
  await getDb().delete(submissions).where(eq(submissions.id, id));
  return [];
}
