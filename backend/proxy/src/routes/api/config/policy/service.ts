import {
  deserializeIntegration,
  serializeIntegration,
} from '@danmaku-anywhere/integration-policy'
import { desc, like, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { createDb } from '@/db'
import { policy } from '@/db/schema/siteIntegration'
import type { uploadSchema } from './schemas'

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
  db: ReturnType<typeof createDb>,
  filters: ListFilters,
  pagination: Pagination
) {
  const { keyword, domain, tag } = filters
  const { page, limit } = pagination
  const offset = (page - 1) * limit

  // Build query dynamically
  let query = db.select().from(policy).$dynamic()
  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(policy)
    .$dynamic()

  // Apply keyword filter
  if (keyword) {
    query = query.where(like(policy.name, `%${keyword}%`))
    countQuery = countQuery.where(like(policy.name, `%${keyword}%`))
  }

  // Apply tag filter - using JSON_EACH to search in JSON array
  if (tag) {
    const tagCondition = sql`EXISTS (
      SELECT 1 FROM json_each(${policy.tags})
      WHERE json_each.value LIKE ${'%' + tag + '%'}
    )`
    query = query.where(tagCondition)
    countQuery = countQuery.where(tagCondition)
  }

  // Apply domain filter - using JSON_EACH to search in JSON array
  if (domain) {
    const domainCondition = sql`EXISTS (
      SELECT 1 FROM json_each(${policy.domains})
      WHERE json_each.value = ${domain}
    )`
    query = query.where(domainCondition)
    countQuery = countQuery.where(domainCondition)
  }

  // Execute queries in parallel
  const [results, totalCount] = await Promise.all([
    query
      .orderBy(desc(sql`(${policy.upvotes} - ${policy.downvotes})`))
      .limit(limit)
      .offset(offset)
      .all(),
    countQuery.get(),
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

export async function createPolicy(
  db: ReturnType<typeof createDb>,
  data: UploadData
) {
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
  })

  return { configId }
}

export async function getPoliciesByDomain(
  db: ReturnType<typeof createDb>,
  hostname: string
) {
  // Query using JSON_EACH to search in domains JSON array
  const result = await db
    .select()
    .from(policy)
    .where(
      sql`EXISTS (
        SELECT 1 FROM json_each(${policy.domains})
        WHERE json_each.value = ${hostname}
      )`
    )
    .orderBy(desc(sql`(${policy.upvotes} - ${policy.downvotes})`))
    .all()

  return result.map((r) => ({
    ...r,
    data: deserializeIntegration(r.data),
  }))
}

export async function getPoliciesByTag(
  db: ReturnType<typeof createDb>,
  tag: string
) {
  // Query using JSON_EACH to search in tags JSON array
  const result = await db
    .select()
    .from(policy)
    .where(
      sql`EXISTS (
        SELECT 1 FROM json_each(${policy.tags})
        WHERE json_each.value LIKE ${'%' + tag + '%'}
      )`
    )
    .all()

  return result
}

export async function voteOnPolicy(
  db: ReturnType<typeof createDb>,
  id: string,
  type: 'up' | 'down'
) {
  if (type === 'up') {
    await db
      .update(policy)
      .set({ upvotes: sql`${policy.upvotes} + 1` })
      .where(sql`${policy.id} = ${id}`)
  } else {
    await db
      .update(policy)
      .set({ downvotes: sql`${policy.downvotes} + 1` })
      .where(sql`${policy.id} = ${id}`)
  }
}
