import { count, eq, sql } from 'drizzle-orm';
import { getDb } from '../client.js';
import { events, eventTagMappings, eventTags, forms } from '../schema.js';

export async function listEvents() {
  return getDb().select().from(events);
}

export async function listEventsWithSurveyCountsAndTags() {
  const formCounts = getDb()
    .select({
      eventId: forms.eventId,
      surveyCount: count(forms.id).as('survey_count')
    })
    .from(forms)
    .groupBy(forms.eventId)
    .as('survey_counts');

  const tagAgg = getDb()
    .select({
      eventId: eventTagMappings.eventId,
      tags: sql`group_concat(${eventTags.name}, ',')`.as('tags')
    })
    .from(eventTagMappings)
    .innerJoin(eventTags, eq(eventTags.id, eventTagMappings.tagId))
    .groupBy(eventTagMappings.eventId)
    .as('tag_agg');

  const rows = await getDb()
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      surveyCount: sql`coalesce(${formCounts.surveyCount}, 0)`.as('surveyCount'),
      tagsCsv: tagAgg.tags
    })
    .from(events)
    .leftJoin(formCounts, eq(formCounts.eventId, events.id))
    .leftJoin(tagAgg, eq(tagAgg.eventId, events.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    surveyCount: Number(row.surveyCount ?? 0),
    tags: row.tagsCsv ? String(row.tagsCsv).split(',') : []
  }));
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
