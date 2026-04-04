import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.js';
import { getSetting, SETTINGS_KEYS } from '../common/settings/settings.js';

let db = null;
let connectionPool = null;
let isConnected = false;

function getMysqlConfig() {
  const rawPort = getSetting(SETTINGS_KEYS.MYSQL_PORT);
  const parsedPort = Number(rawPort);

  return {
    host: getSetting(SETTINGS_KEYS.MYSQL_HOST) || '',
    port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : null,
    database: getSetting(SETTINGS_KEYS.MYSQL_DATABASE) || '',
    user: getSetting(SETTINGS_KEYS.MYSQL_USER) || '',
    password: process.env.DB_PASSWORD || ''
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

async function createPool(config) {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000
  });
  const conn = await pool.getConnection();
  conn.release();
  return pool;
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
    console.warn('MySQL configuration incomplete, missing:', missing.join(', '));
    isConnected = false;
    return;
  }

  try {
    connectionPool = await createPool(config);
    db = drizzle(connectionPool, { schema, mode: 'default' });
    isConnected = true;
    console.log('MySQL database connected successfully');
  } catch (err) {
    console.error('Failed to connect to MySQL database:', err.message);
    isConnected = false;
    db = null;
    connectionPool = null;
  }
}

export async function reinitDb() {
  if (connectionPool) {
    await connectionPool.end().catch(() => {});
    connectionPool = null;
  }
  db = null;
  isConnected = false;
  await initDb();
}

export async function ensureDatabaseReady(migrationsFolder) {
  await initDb();

  if (!isConnected) {
    console.warn('Skipping migrations: not connected to MySQL database');
    return;
  }

  try {
    await migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully');
  } catch (err) {
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
