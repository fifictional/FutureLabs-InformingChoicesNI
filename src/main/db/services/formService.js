import {
  getGoogleFormById,
  getGoogleFormResponseById,
  getGoogleFormResponsesById
} from '../../common/google-forms/google-forms';
import { getDb } from '../client';
import { events, forms, submissions } from '../schema';
import { and, count, eq } from 'drizzle-orm';

function serializeSchemaValue(schemaValue) {
  if (schemaValue == null) return null;
  return typeof schemaValue === 'string' ? schemaValue : JSON.stringify(schemaValue);
}

export async function listForms() {
  await refreshResponsesAndSchemaForAllGoogleForms();
  return getDb().select().from(forms);
}

export async function findFormById(id) {
  await refreshSchemaAndResponses(id);
  return getDb().select().from(forms).where(eq(forms.id, id)).get();
}

export async function listFormWithEventNameAndResponseCount() {
  await refreshResponsesAndSchemaForAllGoogleForms();
  const db = getDb();
  const result = await db
    .select({
      id: forms.id,
      name: forms.name,
      provider: forms.provider,
      baseLink: forms.baseLink,
      externalId: forms.externalId,
      eventId: forms.eventId,
      schema: forms.schema,
      eventName: events.name,
      responseCount: db.$count(submissions, eq(submissions.formId, forms.id))
    })
    .from(forms)
    .leftJoin(events, eq(events.id, forms.eventId));

  const safeJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  return result.map((form) => ({
    ...form,
    schema: form.schema ? safeJsonParse(form.schema) : form.schema
  }));
}

export async function listFormsByEvent(eventId) {
  await refreshResponsesAndSchemaForAllGoogleForms();
  return getDb().select().from(forms).where(eq(forms.eventId, eventId));
}

export async function createForm(data) {
  return getDb()
    .insert(forms)
    .values({
      name: data.name,
      provider: data.provider,
      baseLink: data.baseLink,
      externalId: data.externalId,
      eventId: data.eventId,
      schema: serializeSchemaValue(data.schema)
    })
    .returning();
}

export async function deleteForm(id) {
  return getDb().delete(forms).where(eq(forms.id, id)).returning();
}

export async function updateForm(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.provider !== undefined) updateData.provider = data.provider;
  if (data.baseLink !== undefined) updateData.baseLink = data.baseLink;
  if (data.externalId !== undefined) updateData.externalId = data.externalId;
  if (data.eventId !== undefined) updateData.eventId = data.eventId;
  if (data.schema !== undefined) updateData.schema = serializeSchemaValue(data.schema);

  return getDb().update(forms).set(updateData).where(eq(forms.id, id)).returning();
}

export async function refreshSchemaAndResponses(formId) {
  const form = await getDb().select().from(forms).where(eq(forms.id, formId)).get();
  if (!form) {
    throw new Error(`Form with id ${formId} not found`);
  }

  if (form.provider === 'google_forms') {
    const { externalId } = form;
    if (!externalId) {
      throw new Error(`Form with id ${formId} does not have an externalId`);
    }

    const googleForm = await getGoogleFormById(externalId);
    const responses = await getGoogleFormResponsesById(externalId);

    const db = getDb();
    db.transaction((tx) => {
      tx.update(forms)
        .set({ schema: serializeSchemaValue(googleForm) })
        .where(eq(forms.id, formId))
        .run();

      for (const response of responses.responses || []) {
        const existingSubmission = tx
          .select()
          .from(submissions)
          .where(
            and(eq(submissions.formId, formId), eq(submissions.externalId, response.responseId))
          )
          .get();

        if (existingSubmission) {
          tx.update(submissions)
            .set({ submittedAt: new Date(response.lastSubmittedTime) })
            .where(eq(submissions.id, existingSubmission.id))
            .run();
        } else {
          tx.insert(submissions)
            .values({
              formId,
              submittedAt: new Date(response.lastSubmittedTime),
              externalId: response.responseId
            })
            .run();
        }
      }
    });
  }
}

export async function refreshResponsesAndSchemaForAllGoogleForms() {
  const googleForms = await getDb().select().from(forms).where(eq(forms.provider, 'google_forms'));

  for (const form of googleForms) {
    await refreshSchemaAndResponses(form.id);
  }

  return { refreshedFormIds: googleForms.map((form) => form.id) };
}
