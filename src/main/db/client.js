import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

let db;

function getDbPath() {
  const appDataDirectory = app.getPath('userData');
  return path.join(appDataDirectory, 'app.db');
}

function tableExists(sqlite, tableName) {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
}

function runMigrations(dbPath, migrationsFolder) {
  const sqlite = new Database(dbPath);

  try {
    const migrationDb = drizzle(sqlite, { schema });
    migrate(migrationDb, { migrationsFolder });
  } finally {
    sqlite.close();
  }
}

function backupDatabaseFiles(dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBasePath = `${dbPath}.backup-invalid-${timestamp}`;
  const suffixes = ['', '-wal', '-shm'];

  for (const suffix of suffixes) {
    const sourcePath = `${dbPath}${suffix}`;
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, `${backupBasePath}${suffix}`);
    }
  }

  return backupBasePath;
}

function removeDatabaseFiles(dbPath) {
  const suffixes = ['', '-wal', '-shm'];

  for (const suffix of suffixes) {
    const filePath = `${dbPath}${suffix}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function ensureCompatibility(sqlite) {
  if (tableExists(sqlite, 'submissions')) {
    const submissionColumns = sqlite.prepare("PRAGMA table_info('submissions')").all();
    const hasUserReferenceId = submissionColumns.some(
      (column) => column.name === 'user_reference_id'
    );

    if (!hasUserReferenceId) {
      sqlite.exec('ALTER TABLE submissions ADD COLUMN user_reference_id TEXT');
    }
  }

  if (tableExists(sqlite, 'charts')) {
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

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      non_confidential_identifier TEXT,
      date_of_birth INTEGER,
      reference_id TEXT NOT NULL UNIQUE
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value_text TEXT,
      value_number INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);
}

function createDb() {
  const dbPath = getDbPath();
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
  ensureDatabaseReady(migrationsFolder);
}

export function ensureDatabaseReady(migrationsFolder) {
  if (!migrationsFolder || !fs.existsSync(migrationsFolder)) {
    console.warn('Migrations folder was not found, skipping migration step:', migrationsFolder);
    return;
  }

  const dbPath = getDbPath();
  const hasExistingDb = fs.existsSync(dbPath);

  if (!hasExistingDb) {
    runMigrations(dbPath, migrationsFolder);
    return;
  }

  try {
    runMigrations(dbPath, migrationsFolder);
  } catch (error) {
    console.error(
      'Database migration failed. Backing up invalid DB and recreating a fresh one.',
      error
    );
    const backupBasePath = backupDatabaseFiles(dbPath);
    removeDatabaseFiles(dbPath);
    runMigrations(dbPath, migrationsFolder);
    console.warn('Recreated database from migrations. Backup path prefix:', backupBasePath);
  }
}
