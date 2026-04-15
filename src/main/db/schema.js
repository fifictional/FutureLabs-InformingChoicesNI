import {
  mysqlTable,
  varchar,
  int,
  text,
  double,
  datetime,
  uniqueIndex,
  index,
  mysqlEnum
} from 'drizzle-orm/mysql-core';

// Define the SQL database schema using Drizzle ORM's MySQL adapter

export const events = mysqlTable('events', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description')
});

export const eventTags = mysqlTable('event_tags', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  slug: varchar('slug', { length: 255 }).notNull().unique()
});

export const eventTagMappings = mysqlTable(
  'event_tag_mappings',
  {
    id: int('id').autoincrement().primaryKey(),
    eventId: int('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tagId: int('tag_id')
      .notNull()
      .references(() => eventTags.id, { onDelete: 'cascade' })
  },
  (table) => [uniqueIndex('unique_event_tag_mapping').on(table.eventId, table.tagId)]
);

export const forms = mysqlTable(
  'forms',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    provider: mysqlEnum('provider', ['google_forms', 'file']).notNull(),
    baseLink: text('base_link'),
    externalId: varchar('external_id', { length: 255 }),
    eventId: int('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    schema: text('schema')
  },
  (table) => [index('idx_forms_event_id').on(table.eventId)]
);

export const questions = mysqlTable(
  'questions',
  {
    id: int('id').autoincrement().primaryKey(),
    text: text('text').notNull(),
    answerType: mysqlEnum('answer_type', ['text', 'number', 'choice']).notNull(),
    formId: int('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' })
  },
  (table) => [index('idx_questions_form_id').on(table.formId)]
);

export const submissions = mysqlTable(
  'submissions',
  {
    id: int('id').autoincrement().primaryKey(),
    formId: int('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    userReferenceId: varchar('user_reference_id', { length: 255 }),
    submittedAt: datetime('submitted_at').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull()
  },
  (table) => [
    uniqueIndex('unique_submission_per_form').on(table.formId, table.externalId),
    index('idx_submissions_form_id').on(table.formId)
  ]
);

export const responses = mysqlTable(
  'responses',
  {
    id: int('id').autoincrement().primaryKey(),
    submissionId: int('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    questionId: int('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    valueText: text('value_text'),
    valueNumber: double('value_number'),
    valueChoice: varchar('value_choice', { length: 500 })
  },
  (table) => [
    uniqueIndex('unique_response_per_question_and_submission').on(
      table.submissionId,
      table.questionId
    ),
    index('idx_responses_submission_id').on(table.submissionId),
    index('idx_responses_question_id').on(table.questionId),
    index('idx_responses_submission_question').on(table.submissionId, table.questionId)
  ]
);

export const questionChoice = mysqlTable(
  'question_choice',
  {
    id: int('id').autoincrement().primaryKey(),
    questionId: int('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    choiceText: varchar('choice_text', { length: 500 }).notNull()
  },
  (table) => [index('idx_question_choice_question_id').on(table.questionId)]
);

export const clients = mysqlTable('clients', {
  id: int('id').autoincrement().primaryKey(),
  nonConfidentialIdentifier: varchar('non_confidential_identifier', { length: 255 }),
  dateOfBirth: datetime('date_of_birth'),
  referenceId: varchar('reference_id', { length: 255 }).notNull().unique()
});

export const appSettings = mysqlTable('app_settings', {
  id: int('id').autoincrement().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  valueText: text('value_text'),
  valueNumber: int('value_number').notNull().default(0),
  updatedAt: datetime('updated_at').notNull()
});

export const statisticOverviews = mysqlTable(
  'statistic_overviews',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    defaultQuestion: varchar('default_question', { length: 500 }).notNull(),
    questionId: int('question_id').references(() => questions.id, { onDelete: 'set null' })
  },
  (table) => [index('idx_statistic_overviews_question_id').on(table.questionId)]
);

export const charts = mysqlTable('charts', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  chartType: mysqlEnum('chart_type', [
    'question',
    'comparison',
    'response_trend',
    'geo',
    'word_cloud'
  ]).notNull(),
  configuration: text('configuration').notNull(),
  displayOrder: int('display_order').notNull().default(0),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull()
});
