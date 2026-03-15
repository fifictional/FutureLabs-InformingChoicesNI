import { db } from '../client'
import { eventTagMappings, eventTags } from '../schema'
import { and, eq } from 'drizzle-orm'

export async function listEventTags() {
  return db.select().from(eventTags)
}

export async function createEventTag(data) {
  return db.insert(eventTags).values({ name: data.name, slug: data.slug }).returning()
}

export async function deleteEventTag(id) {
  return db.delete(eventTags).where(eq(eventTags.id, id)).returning()
}

export async function listEventTagsForEvent(eventId) {
  return db
    .select({ id: eventTags.id, name: eventTags.name, slug: eventTags.slug })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTagMappings.tagId, eventTags.id))
    .where(eq(eventTagMappings.eventId, eventId))
}

export async function addTagToEvent(eventId, tagId) {
  return db
    .insert(eventTagMappings)
    .values({ eventId, tagId })
    .onConflictDoNothing({ target: [eventTagMappings.eventId, eventTagMappings.tagId] })
    .returning()
}

export async function removeTagFromEvent(eventId, tagId) {
  return db
    .delete(eventTagMappings)
    .where(and(eq(eventTagMappings.eventId, eventId), eq(eventTagMappings.tagId, tagId)))
    .returning()
}
