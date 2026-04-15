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

export async function listSubmissionsByForm(formId, offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb().select().from(submissions).where(eq(submissions.formId, formId));
  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
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
