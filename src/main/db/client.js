import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

let db;

function ensureCompatibility(sqlite) {
  const submissionColumns = sqlite.prepare("PRAGMA table_info('submissions')").all();
  const hasUserReferenceId = submissionColumns.some(
    (column) => column.name === 'user_reference_id'
  );

  if (!hasUserReferenceId) {
    sqlite.exec('ALTER TABLE submissions ADD COLUMN user_reference_id TEXT');
  }

  const chartColumns = sqlite.prepare("PRAGMA table_info('charts')").all();
  const hasDisplayOrder = chartColumns.some((column) => column.name === 'display_order');

  if (!hasDisplayOrder) {
    sqlite.exec('ALTER TABLE charts ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0');

    const existingCharts = sqlite
      .prepare('SELECT id FROM charts ORDER BY updated_at ASC, id ASC')
      .all();
    const updateDisplayOrder = sqlite.prepare('UPDATE charts SET display_order = ? WHERE id = ?');

    const backfillDisplayOrder = sqlite.transaction(() => {
      existingCharts.forEach((chart, index) => {
        updateDisplayOrder.run(index, chart.id);
      });
    });

    backfillDisplayOrder();
  }
}

function createDb() {
  // Store app.db in the OS's app data directory
  const appDataDirectory = app.getPath('userData');
  const dbPath = path.join(appDataDirectory, 'app.db');
  const sqlite = new Database(dbPath);

  // Use write-ahead logging
  sqlite.pragma('journal_mode = WAL');

  // Backfill schema changes for databases created before migration files were added.
  ensureCompatibility(sqlite);

  return drizzle(sqlite, { schema });
}

export function initDb() {
  if (!db) {
    db = createDb();
  }

  return db;
}

export function getDb() {
  return initDb();
}

export function initialDbSetup(migrationsFolder) {
  const appDataDirectory = app.getPath('userData');
  const dbPath = path.join(appDataDirectory, 'app.db');
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: migrationsFolder
  });
}
