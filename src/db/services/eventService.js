import { eq } from 'drizzle-orm';
import { getDb } from '../client.js';
import { events } from '../schema.js';

export async function listEvents() {
  return getDb().select().from(events);
}

export async function createEvent(data) {
  return getDb()
    .insert(events)
    .values({ name: data.name, description: data.description ?? null })
    .returning();
}

export async function updateEvent(id, data) {
  return getDb()
    .update(events)
    .set({ name: data.name, description: data.description ?? null })
    .where(eq(events.id, id))
    .returning();
}

export async function deleteEvent(id) {
  return getDb().delete(events).where(eq(events.id, id)).returning();
}
