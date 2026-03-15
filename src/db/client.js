import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import path from 'path'
import * as schema from './schema.js'

let db

function createDb() {
  // Store app.db in the OS's app data directory
  const appDataDirectory = app.getPath('userData')
  const dbPath = path.join(appDataDirectory, 'app.db')
  const sqlite = new Database(dbPath)

  // Use write-ahead logging
  sqlite.pragma('journal_mode = WAL')

  return drizzle(sqlite, { schema })
}

export function initDb() {
  if (!db) {
    db = createDb()
  }

  return db
}

export function getDb() {
  return initDb()
}
