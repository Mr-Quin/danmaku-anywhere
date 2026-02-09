import { drizzle } from 'drizzle-orm/d1'
import * as authSchema from './schema/auth'
import * as siteIntegrationSchema from './schema/siteIntegration'

function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...siteIntegrationSchema, ...authSchema } })
}

export type Database = ReturnType<typeof createDb>

let db: Database | null = null

export function getOrCreateDb(d1: D1Database) {
  if (db) {
    return db
  }

  db = createDb(d1)

  return db
}
