import { getDb } from '../client';
import { eventTagMappings, eventTags } from '../schema';
import { and, eq } from 'drizzle-orm';

export async function listEventTags() {
  return getDb().select().from(eventTags);
}

export async function listEventTagsPaginated(offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb().select().from(eventTags);
  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
}

export async function findEventTagBySlug(slug) {
  const [row] = await getDb().select().from(eventTags).where(eq(eventTags.slug, slug)).limit(1);
  return row ?? null;
}

export async function createEventTag(data) {
  const db = getDb();
  const [{ id }] = await db
    .insert(eventTags)
    .values({ name: data.name, slug: data.slug })
    .$returningId();
  const [row] = await db.select().from(eventTags).where(eq(eventTags.id, id)).limit(1);
  return [row];
}

export async function deleteEventTag(id) {
  await getDb().delete(eventTags).where(eq(eventTags.id, id));
  return [];
}

export async function listEventTagsForEvent(eventId) {
  return getDb()
    .select({ id: eventTags.id, name: eventTags.name, slug: eventTags.slug })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTagMappings.tagId, eventTags.id))
    .where(eq(eventTagMappings.eventId, eventId));
}

export async function listEventTagsForEventPaginated(eventId, offset = 0, limit = null) {
  const safeLimit = limit == null ? null : Math.min(1000, Math.max(1, Number(limit) || 100));
  const query = getDb()
    .select({ id: eventTags.id, name: eventTags.name, slug: eventTags.slug })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTagMappings.tagId, eventTags.id))
    .where(eq(eventTagMappings.eventId, eventId));

  if (safeLimit == null) {
    return query;
  }
  const safeOffset = Math.max(0, Number(offset) || 0);
  return query.limit(safeLimit).offset(safeOffset);
}

export async function addTagToEvent(eventId, tagId) {
  await getDb()
    .insert(eventTagMappings)
    .values({ eventId, tagId })
    .onDuplicateKeyUpdate({ set: { eventId } });
  return [];
}

export async function removeTagFromEvent(eventId, tagId) {
  await getDb()
    .delete(eventTagMappings)
    .where(and(eq(eventTagMappings.eventId, eventId), eq(eventTagMappings.tagId, tagId)));

  const [remaining] = await getDb()
    .select()
    .from(eventTagMappings)
    .where(eq(eventTagMappings.tagId, tagId))
    .limit(1);

  if (!remaining) {
    await getDb().delete(eventTags).where(eq(eventTags.id, tagId));
  }
  return [];
}
