import { getDb } from '../client';
import { eventTagMappings, eventTags } from '../schema';
import { and, eq } from 'drizzle-orm';

export async function listEventTags() {
  return getDb().select().from(eventTags);
}

export async function findEventTagBySlug(slug) {
  return getDb().select().from(eventTags).where(eq(eventTags.slug, slug)).limit(1).get();
}

export async function createEventTag(data) {
  return getDb().insert(eventTags).values({ name: data.name, slug: data.slug }).returning();
}

export async function deleteEventTag(id) {
  return getDb().delete(eventTags).where(eq(eventTags.id, id)).returning();
}

export async function listEventTagsForEvent(eventId) {
  return getDb()
    .select({ id: eventTags.id, name: eventTags.name, slug: eventTags.slug })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTagMappings.tagId, eventTags.id))
    .where(eq(eventTagMappings.eventId, eventId));
}

export async function addTagToEvent(eventId, tagId) {
  return getDb()
    .insert(eventTagMappings)
    .values({ eventId, tagId })
    .onConflictDoNothing({ target: [eventTagMappings.eventId, eventTagMappings.tagId] })
    .returning();
}

export async function removeTagFromEvent(eventId, tagId) {
  const tag = getDb()
    .delete(eventTagMappings)
    .where(and(eq(eventTagMappings.eventId, eventId), eq(eventTagMappings.tagId, tagId)))
    .returning();

  const remainingMappings = getDb()
    .select()
    .from(eventTagMappings)
    .where(eq(eventTagMappings.tagId, tagId));
  const [remaining] = await remainingMappings;
  if (!remaining) {
    await getDb().delete(eventTags).where(eq(eventTags.id, tagId)).returning();
  }
  return tag;
}
