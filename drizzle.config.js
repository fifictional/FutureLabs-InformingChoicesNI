/** @type {import('drizzle-kit').Config} */
export default {
  schema: './src/main/db/schema.js',
  out: './drizzle',
  dbCredentials: { url: './dev.db' },
  dialect: 'sqlite'
}
