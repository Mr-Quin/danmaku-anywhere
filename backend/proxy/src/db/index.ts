import { drizzle } from 'drizzle-orm/d1'
import * as authSchema from './schema/auth'
import * as siteIntegrationSchema from './schema/siteIntegration'

export type Database = ReturnType<typeof createDb>

export const createDb = (d1: D1Database) => {
  return drizzle(d1, { schema: { ...siteIntegrationSchema, ...authSchema } })
}
