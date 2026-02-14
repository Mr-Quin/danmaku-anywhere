import {
  deserializeIntegration,
  serializeIntegration,
} from '@danmaku-anywhere/integration-policy'
import { and, count, desc, eq, like, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { Database } from '@/db'
import { policy } from '@/db/schema/siteIntegration'
import type { policyResponseSchema, uploadSchema } from './schemas'

type UploadData = z.infer<typeof uploadSchema>

export interface ListFilters {
  keyword?: string
  domain?: string
  tag?: string
}

export interface Pagination {
  page: number
  limit: number
}

export async function listPolicies(
  db: Database,
  filters: ListFilters,
  pagination: Pagination
) {
  const { keyword, domain, tag } = filters
  const { page, limit } = pagination
  const offset = (page - 1) * limit

  const conditions = [eq(policy.isPublic, true)]

  if (keyword) {
    conditions.push(like(policy.name, `%${keyword}%`))
  }

  if (tag) {
    conditions.push(
      sql`EXISTS (
          SELECT 1 FROM json_each(${policy.tags})
          WHERE json_each.value LIKE ${'%' + tag + '%'}
        )`
    )
  }

  if (domain) {
    conditions.push(
      sql`EXISTS (
          SELECT 1 FROM json_each(${policy.domains})
          WHERE json_each.value LIKE ${'%' + domain + '%'}
        )`
    )
  }

  const [results, totalCount] = await Promise.all([
    db
      .select()
      .from(policy)
      .where(and(...conditions))
      .orderBy(desc(sql`(${policy.upvotes} - ${policy.downvotes})`))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ count: count() })
      .from(policy)
      .where(and(...conditions))
      .get(),
  ])

  return {
    data: results.map((r) => ({
      ...r,
      data: deserializeIntegration(r.data),
    })),
    pagination: {
      page,
      limit,
      total: totalCount?.count || 0,
      totalPages: Math.ceil((totalCount?.count || 0) / limit),
    },
  }
}

export async function createPolicy(db: Database, data: UploadData) {
  const { name, config, domains, tags, authorId, authorName } = data
  const configId = crypto.randomUUID()

  await db.insert(policy).values({
    id: configId,
    name,
    data: serializeIntegration(config),
    domains,
    tags,
    authorId,
    authorName,
    isPublic: true,
  })

  return { configId }
}

export async function getPoliciesByDomain(
  db: Database,
  hostname: string
): Promise<z.infer<typeof policyResponseSchema>[]> {
  const result = await db
    .select()
    .from(policy)
    .where(
      sql`EXISTS (
        SELECT 1 FROM json_each(${policy.domains})
        WHERE json_each.value LIKE ${'%' + hostname + '%'}
      )`
    )
    .orderBy(desc(sql`(${policy.upvotes} - ${policy.downvotes})`))
    .all()

  return result.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    data: deserializeIntegration(r.data),
  }))
}

export async function voteOnPolicy(
  db: Database,
  id: string,
  type: 'up' | 'down'
) {
  if (type === 'up') {
    await db
      .update(policy)
      .set({ upvotes: sql`${policy.upvotes} + 1` })
      .where(eq(policy.id, id))
  } else {
    await db
      .update(policy)
      .set({ downvotes: sql`${policy.downvotes} + 1` })
      .where(eq(policy.id, id))
  }
}

export async function incrementDownload(db: Database, id: string) {
  await db
    .update(policy)
    .set({ downloads: sql`${policy.downloads} + 1` })
    .where(eq(policy.id, id))
}
