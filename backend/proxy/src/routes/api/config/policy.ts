import {
  deserializeIntegration,
  serializeIntegration,
  zIntegrationPolicy,
} from '@danmaku-anywhere/integration-policy'
import { desc, eq, like, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { createDb } from '@/db'
import { domains as domainsDb, policy } from '@/db/schema/siteIntegration'
import { factory } from '@/factory'

const policyRouter = factory.createApp()

const uploadSchema = z.object({
  name: z.string().min(1).trim(),
  config: zIntegrationPolicy,
  domains: z
    .array(z.string().refine((d) => d.length > 0))
    .optional()
    .default([]),
  tags: z.array(z.string().min(1).trim()).optional().default([]),
  authorId: z.string().trim().optional(),
  authorName: z.string().trim().optional(),
})

policyRouter.post('/', async (c) => {
  const body = await c.req.json()
  const result = uploadSchema.safeParse(body)

  if (!result.success) {
    throw new HTTPException(400, {
      cause: result.error,
      message: 'Invalid request body',
    })
  }

  const { name, config, domains, tags, authorId, authorName } = result.data
  const db = createDb(c.env.DB)

  try {
    const configId = crypto.randomUUID()

    await db.batch([
      // 1. Insert Config
      db
        .insert(policy)
        .values({
          id: configId,
          name,
          data: serializeIntegration(config),
          tags: tags ? tags.join(',') : null,
          authorId,
          authorName,
        }),
      // 2. Insert Config Domains
      db
        .insert(domainsDb)
        .values(
          domains.map((domain) => ({
            configId,
            domain,
          }))
        ),
    ])

    return c.json({ success: true, configId })
  } catch (e) {
    throw new HTTPException(500, {
      cause: e,
      message: 'Failed to create policy',
    })
  }
})

policyRouter.get('/domain', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    throw new HTTPException(400, {
      message: 'URL is required',
    })
  }

  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new HTTPException(400, {
      message: 'Invalid URL',
    })
  }

  const db = createDb(c.env.DB)

  const result = await db
    .select({
      config: policy,
    })
    .from(domainsDb)
    .innerJoin(policy, eq(domainsDb.configId, policy.id))
    .where(eq(domainsDb.domain, hostname))
    .orderBy(desc(sql`(${policy.upvotes} - ${policy.downvotes})`))
    .all()

  return c.json({
    success: true,
    data: result.map((r) => {
      return {
        ...r.config,
        data: deserializeIntegration(r.config.data),
      }
    }),
  })
})

policyRouter.get('/tag', async (c) => {
  const tagName = c.req.query('tag')
  if (!tagName) {
    throw new HTTPException(400, {
      message: 'Tag is required',
    })
  }

  const db = createDb(c.env.DB)

  const searchPattern = `%${tagName}%`

  const result = await db
    .select()
    .from(policy)
    .where(like(policy.tags, searchPattern))
    .all()

  return c.json({ success: true, data: result })
})

policyRouter.post('/:id/vote', async (c) => {
  const configId = c.req.param('id')
  const body = await c.req.json()
  const schema = z.object({
    type: z.enum(['up', 'down']),
  })
  const result = schema.safeParse(body)

  if (!result.success) {
    throw new HTTPException(400, {
      cause: result.error,
      message: 'Invalid request body',
    })
  }
  const { type } = result.data
  const db = createDb(c.env.DB)

  if (type === 'up') {
    await db
      .update(policy)
      .set({ upvotes: sql`${policy.upvotes} + 1` })
      .where(eq(policy.id, configId))
  } else {
    await db
      .update(policy)
      .set({ downvotes: sql`${policy.downvotes} + 1` })
      .where(eq(policy.id, configId))
  }

  return c.json({ success: true })
})

export { policyRouter }
