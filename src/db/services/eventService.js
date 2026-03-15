import { eq } from 'drizzle-orm'
import { db } from '../client.js'
import { events } from '../schema.js'

export async function listEvents() {
  return db.select().from(events)
}

export async function createEvent(data) {
  return db
    .insert(events)
    .values({ name: data.name, description: data.description ?? null })
    .returning()
}

export async function updateEvent(id, data) {
  return db
    .update(events)
    .set({ name: data.name, description: data.description ?? null })
    .where(eq(events.id, id))
    .returning()
}

export async function deleteEvent(id) {
  return db.delete(events).where(eq(events.id, id)).returning()
}
