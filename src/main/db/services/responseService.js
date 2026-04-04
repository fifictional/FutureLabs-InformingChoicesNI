import { getDb } from '../client';
import { responses } from '../schema';
import { and, eq } from 'drizzle-orm';

export async function listResponsesBySubmission(submissionId) {
  return getDb().select().from(responses).where(eq(responses.submissionId, submissionId));
}

export async function upsertResponse(data) {
  const db = getDb();
  await db
    .insert(responses)
    .values({
      submissionId: data.submissionId,
      questionId: data.questionId,
      valueText: data.valueText ?? null,
      valueNumber: data.valueNumber ?? null,
      valueChoice: data.valueChoice ?? null
    })
    .onDuplicateKeyUpdate({
      set: {
        valueText: data.valueText ?? null,
        valueNumber: data.valueNumber ?? null,
        valueChoice: data.valueChoice ?? null
      }
    });
  const [row] = await db
    .select()
    .from(responses)
    .where(
      and(eq(responses.submissionId, data.submissionId), eq(responses.questionId, data.questionId))
    )
    .limit(1);
  return [row];
}

export async function deleteResponse(id) {
  await getDb().delete(responses).where(eq(responses.id, id));
  return [];
}
