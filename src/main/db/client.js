import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.js';
import { getSetting, SETTINGS_KEYS } from '../common/settings/settings.js';
import { logger } from '../common/logger.js';

let db = null;
let connectionPool = null;
let isConnected = false;
const MAX_RECONNECT_ATTEMPTS = 3;

function getMysqlConfig() {
  const rawPort = getSetting(SETTINGS_KEYS.MYSQL_PORT);
  const parsedPort = Number(rawPort);
  const password = process.env.DB_PASSWORD || '';

  return {
    host: getSetting(SETTINGS_KEYS.MYSQL_HOST) || '',
    port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : null,
    database: getSetting(SETTINGS_KEYS.MYSQL_DATABASE) || '',
    user: getSetting(SETTINGS_KEYS.MYSQL_USER) || '',
    password
  };
}

export function isDbConnected() {
  return isConnected;
}

export function getDb() {
  if (!db) {
    throw new Error(
      'Database is not connected. Please configure the MySQL connection in Settings.'
    );
  }
  return db;
}

/**
 * Attempt to reconnect to the database
 * Returns true if successful, false otherwise
 */
export async function attemptReconnect() {
  logger.warn('Attempting to reconnect to database...');
  for (let i = 0; i < MAX_RECONNECT_ATTEMPTS; i++) {
    try {
      await initDb();
      if (isConnected) {
        logger.info('Database reconnection successful');
        return true;
      }
    } catch (err) {
      logger.warn(`Reconnection attempt ${i + 1} failed: ${err.message}`);
      if (i < MAX_RECONNECT_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  logger.error('Failed to reconnect to database after multiple attempts');
  return false;
}

async function createPool(config) {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    // Reconnect on disconnection
    enableKeepAlive: true
  });
  const conn = await pool.getConnection();
  conn.release();
  return pool;
}

function isIgnorableMigrationErrorText(err) {
  const text = String(err?.message || '').toLowerCase();
  return (
    text.includes('already exists') ||
    text.includes('duplicate key name') ||
    text.includes('duplicate column name') ||
    text.includes('duplicate entry')
  );
}

function collectErrorCodes(err) {
  const codes = [err?.code, err?.cause?.code, err?.originalError?.code].filter(Boolean);
  return new Set(codes);
}

function migrationTargetsAppSettingsCreate(err) {
  const text = String(err?.message || '').toLowerCase();
  return text.includes('create table `app_settings`') || text.includes('create table app_settings');
}

async function tableExists(databaseName, tableName) {
  if (!connectionPool || !databaseName || !tableName) {
    return false;
  }

  const [rows] = await connectionPool.query(
    `SELECT 1 AS exists_flag
       FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
      LIMIT 1`,
    [databaseName, tableName]
  );

  return Array.isArray(rows) && rows.length > 0;
}

function readLatestMigrationJournalEntry(migrationsFolder) {
  try {
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    if (!fs.existsSync(journalPath)) {
      return null;
    }

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    const entries = Array.isArray(journal?.entries) ? journal.entries : [];
    if (entries.length === 0) {
      return null;
    }

    return entries
      .slice()
      .sort((a, b) => Number(a?.when || 0) - Number(b?.when || 0))
      .at(-1);
  } catch {
    return null;
  }
}

async function bootstrapMigrationsIfSchemaAlreadyPresent(migrationsFolder) {
  const config = getMysqlConfig();
  if (!connectionPool || !config.database) {
    return;
  }

  const appSettingsExists = await tableExists(config.database, 'app_settings');
  if (!appSettingsExists) {
    return;
  }

  await connectionPool.query(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )`
  );

  const latestEntry = readLatestMigrationJournalEntry(migrationsFolder);
  if (!latestEntry?.when) {
    return;
  }

  const migrationHash = String(latestEntry.tag || `bootstrap-${latestEntry.when}`);
  const createdAt = Number(latestEntry.when);

  const [rows] = await connectionPool.query(
    'SELECT COUNT(*) AS count, MAX(created_at) AS maxCreatedAt FROM __drizzle_migrations LIMIT 1'
  );
  const existingCount = Number(rows?.[0]?.count || 0);
  const maxCreatedAt = Number(rows?.[0]?.maxCreatedAt || 0);

  if (existingCount > 0 && maxCreatedAt >= createdAt) {
    return;
  }

  await connectionPool.query(
    'INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)',
    [migrationHash, createdAt]
  );
  logger.info('Synchronized __drizzle_migrations for existing schema');
}

export async function testMysqlConnection(config) {
  let pool = null;
  try {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      waitForConnections: true,
      connectionLimit: 1,
      connectTimeout: 5000
    });
    const conn = await pool.getConnection();
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}

export async function initDb() {
  const config = getMysqlConfig();

  const missing = [];
  if (!config.host) missing.push('host');
  if (!config.port) missing.push('port');
  if (!config.database) missing.push('database');
  if (!config.user) missing.push('user');
  if (!config.password) missing.push('DB_PASSWORD environment variable');

  if (missing.length > 0) {
    const msg = `MySQL configuration incomplete, missing: ${missing.join(', ')}`;
    logger.warn(msg);
    isConnected = false;
    return;
  }

  try {
    connectionPool = await createPool(config);
    db = drizzle(connectionPool, { schema, mode: 'default' });
    isConnected = true;
    logger.info('MySQL database connected successfully');
  } catch (err) {
    logger.error('Failed to connect to MySQL database', err);
    isConnected = false;
    db = null;
    connectionPool = null;
  }
}

export async function reinitDb() {
  if (connectionPool) {
    await connectionPool.end().catch((e) => logger.warn('Error closing pool during reinit', e));
    connectionPool = null;
  }
  db = null;
  isConnected = false;
  await initDb();
}

/**
 * Properly close database connection on app shutdown
 */
export async function closeDb() {
  if (connectionPool) {
    try {
      await connectionPool.end();
      logger.info('Database connection pool closed cleanly');
    } catch (err) {
      logger.error('Error closing database connection pool', err);
    }
    connectionPool = null;
  }
  db = null;
  isConnected = false;
}

export async function ensureDatabaseReady(migrationsFolder) {
  await initDb();

  if (!isConnected) {
    console.warn('Skipping migrations: not connected to MySQL database');
    return;
  }

  try {
    await bootstrapMigrationsIfSchemaAlreadyPresent(migrationsFolder);
  } catch (bootstrapErr) {
    logger.warn(
      'Failed to bootstrap migration metadata; proceeding with normal migration flow',
      bootstrapErr
    );
  }

  try {
    await migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully');
  } catch (err) {
    const errorCodes = collectErrorCodes(err);
    const hasAlreadyExistsCode = errorCodes.has('ER_TABLE_EXISTS_ERROR');
    const hasDuplicateCode =
      errorCodes.has('ER_DUP_KEYNAME') ||
      errorCodes.has('ER_DUP_FIELDNAME') ||
      errorCodes.has('ER_DUP_ENTRY');

    let ignorable = hasAlreadyExistsCode || hasDuplicateCode || isIgnorableMigrationErrorText(err);

    if (!ignorable && migrationTargetsAppSettingsCreate(err)) {
      try {
        const dbName = getMysqlConfig().database;
        ignorable = await tableExists(dbName, 'app_settings');
      } catch (existsCheckErr) {
        logger.warn(
          'Failed checking app_settings table existence during migration error handling',
          existsCheckErr
        );
      }
    }

    if (ignorable) {
      logger.warn('Startup migration reported existing schema objects; continuing startup', err);
      return;
    }

    console.error('Migration failed:', err.message);
    isConnected = false;
    db = null;
  }
}

export async function runMigrations(migrationsFolder) {
  if (!isConnected || !db) {
    throw new Error('Database is not connected. Set up the database first.');
  }

  await migrate(db, { migrationsFolder });
}

function readExpectedMigrationCount(migrationsFolder) {
  try {
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    if (!fs.existsSync(journalPath)) {
      return 0;
    }
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    return Array.isArray(journal?.entries) ? journal.entries.length : 0;
  } catch {
    return 0;
  }
}

export async function getDatabaseHealth(migrationsFolder) {
  const config = getMysqlConfig();
  const requiredTables = [
    'events',
    'event_tags',
    'event_tag_mappings',
    'forms',
    'questions',
    'submissions',
    'responses',
    'question_choice',
    'clients',
    'app_settings',
    'statistic_overviews',
    'charts'
  ];

  if (!isConnected || !connectionPool || !config.database) {
    return {
      ok: false,
      connected: false,
      schemaValid: false,
      migrationsValid: false,
      requiredTablesMissing: requiredTables,
      expectedMigrations: readExpectedMigrationCount(migrationsFolder),
      appliedMigrations: 0,
      pendingMigrations: readExpectedMigrationCount(migrationsFolder),
      message: 'Database is not connected.'
    };
  }

  try {
    const [tableRows] = await connectionPool.query(
      `SELECT table_name AS tableName
       FROM information_schema.tables
       WHERE table_schema = ? AND table_name IN (${requiredTables.map(() => '?').join(',')})`,
      [config.database, ...requiredTables]
    );

    const existingTableNames = new Set(tableRows.map((row) => row.tableName));
    const requiredTablesMissing = requiredTables.filter((name) => !existingTableNames.has(name));
    const schemaValid = requiredTablesMissing.length === 0;

    let appliedMigrations = 0;
    try {
      const [migrationRows] = await connectionPool.query(
        'SELECT COUNT(*) AS count FROM __drizzle_migrations'
      );
      appliedMigrations = Number(migrationRows?.[0]?.count || 0);
    } catch {
      appliedMigrations = 0;
    }

    const expectedMigrations = readExpectedMigrationCount(migrationsFolder);
    const pendingMigrations = Math.max(expectedMigrations - appliedMigrations, 0);
    const migrationsValid = pendingMigrations === 0;
    const ok = schemaValid && migrationsValid;

    return {
      ok,
      connected: true,
      schemaValid,
      migrationsValid,
      requiredTablesMissing,
      expectedMigrations,
      appliedMigrations,
      pendingMigrations,
      message: ok
        ? 'Database schema and migrations look healthy.'
        : 'Database has schema or migration issues.'
    };
  } catch (err) {
    return {
      ok: false,
      connected: true,
      schemaValid: false,
      migrationsValid: false,
      requiredTablesMissing: requiredTables,
      expectedMigrations: readExpectedMigrationCount(migrationsFolder),
      appliedMigrations: 0,
      pendingMigrations: readExpectedMigrationCount(migrationsFolder),
      message: err?.message || 'Failed to inspect database health.'
    };
  }
}
