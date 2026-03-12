import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

export const userBackups = sqliteTable(
  'user_backups',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fileKey: text('file_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index('user_backups_userId_idx').on(table.userId)]
)

export const userBackupsRelations = relations(userBackups, ({ one }) => ({
  user: one(user, {
    fields: [userBackups.userId],
    references: [user.id],
  }),
}))
