import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const policy = sqliteTable('site_integration_policy', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  data: text('data').notNull(),

  // nullable since we don't have a user system
  authorId: text('author_id'),
  authorName: text('author_name'),

  // comma separated tags
  tags: text('tags'),

  // flags
  isPublic: integer('is_public').default(0),

  // metrics
  downloads: integer('downloads').default(0),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const domains = sqliteTable(
  'site_integration_policy_domains',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    configId: text('config_id')
      .notNull()
      .references(() => policy.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
  },
  (t) => [index('domain_idx').on(t.domain)]
)

export const siteIntegrationPolicyRelations = relations(policy, ({ many }) => ({
  domains: many(domains),
}))

export const siteIntegrationDomainsRelations = relations(
  domains,
  ({ one }) => ({
    config: one(policy, {
      fields: [domains.configId],
      references: [policy.id],
    }),
  })
)
