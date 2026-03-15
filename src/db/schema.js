import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Define the SQL database schema using Drizzle ORM's SQLite adapter

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description')
});

export const eventTags = sqliteTable('event_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique()
});

export const eventTagMappings = sqliteTable(
  'event_tag_mappings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => eventTags.id, { onDelete: 'cascade' })
  },
  (table) => [uniqueIndex('unique_event_tag_mapping').on(table.eventId, table.tagId)]
);

export const forms = sqliteTable('forms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  provider: text('provider', { enum: ['google_forms'] }).notNull(),
  baseLink: text('base_link').notNull(),
  externalId: text('external_id').notNull(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  schema: text('schema')
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  formId: integer('form_id')
    .notNull()
    .references(() => forms.id, { onDelete: 'cascade' })
});

export const submissions = sqliteTable(
  'submissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    formId: integer('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull(),
    externalId: text('external_id').notNull()
  },
  (table) => [uniqueIndex('unique_submission_per_form').on(table.formId, table.externalId)]
);

export const responses = sqliteTable(
  'responses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    submissionId: integer('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    valueText: text('value_text'),
    valueNumber: real('value_number'),
    valueChoice: text('value_choice')
  },
  (table) => [
    uniqueIndex('unique_response_per_question_and_submission').on(
      table.submissionId,
      table.questionId
    )
  ]
);
