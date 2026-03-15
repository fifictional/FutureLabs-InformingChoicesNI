import { db } from '../client'
import { forms } from '../schema'
import { eq } from 'drizzle-orm'

function serializeSchemaValue(schemaValue) {
  if (schemaValue == null) return null
  return typeof schemaValue === 'string' ? schemaValue : JSON.stringify(schemaValue)
}

export async function listForms() {
  return db.select().from(forms)
}

export async function listFormsByEvent(eventId) {
  return db.select().from(forms).where(eq(forms.eventId, eventId))
}

export async function createForm(data) {
  return db
    .insert(forms)
    .values({
      name: data.name,
      provider: data.provider,
      baseLink: data.baseLink,
      externalId: data.externalId,
      eventId: data.eventId,
      schema: serializeSchemaValue(data.schema)
    })
    .returning()
}

export async function deleteForm(id) {
  return db.delete(forms).where(eq(forms.id, id)).returning()
}
