import { getDb } from '../client';
import { events, forms, submissions } from '../schema';
import { count, eq } from 'drizzle-orm';

function serializeSchemaValue(schemaValue) {
  if (schemaValue == null) return null;
  return typeof schemaValue === 'string' ? schemaValue : JSON.stringify(schemaValue);
}

export async function listForms() {
  return getDb().select().from(forms);
}

export async function findFormById(id) {
  return getDb().select().from(forms).where(eq(forms.id, id)).get();
}

export async function listFormWithEventNameAndResponseCount() {
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
