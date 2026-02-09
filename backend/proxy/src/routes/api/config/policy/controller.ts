import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import z from 'zod'
import { factory } from '@/factory'
import { requireAuth } from '@/middleware/requireAuth'
import * as schemas from './schemas'
import * as service from './service'

export const policyRouter = factory.createApp()

policyRouter.get(
  '/',
  zValidator('query', schemas.listQuerySchema),
  async function list(c) {
    const { keyword, domain, tag, page, limit } = c.req.valid('query')
    const db = c.get('createDb')()

    try {
      const result = await service.listPolicies(
        db,
        { keyword, domain, tag },
        { page, limit }
      )

      return c.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (e) {
      throw new HTTPException(500, {
        cause: e,
        message: 'Failed to fetch policies',
      })
    }
  }
)

policyRouter.post(
  '/',
  zValidator('json', schemas.uploadSchema),
  async function create(c) {
    const data = c.req.valid('json')
    const db = c.get('createDb')()

    try {
      const { configId } = await service.createPolicy(db, data)
      return c.json({ success: true, configId })
    } catch (e) {
      throw new HTTPException(500, {
        cause: e,
        message: 'Failed to create policy',
      })
    }
  }
)

policyRouter.get(
  '/domain',
  zValidator('query', z.object({ domain: schemas.zDomain })),
  async function getByDomain(c) {
    const { domain } = c.req.valid('query')
    const db = c.get('createDb')()

    try {
      const data = await service.getPoliciesByDomain(db, domain)
      return c.json({ success: true, data })
    } catch (e) {
      throw new HTTPException(500, {
        cause: e,
        message: 'Failed to fetch policies by domain',
      })
    }
  }
)

policyRouter.post(
  '/:id/vote',
  requireAuth(),
  zValidator('json', z.object({ type: z.enum(['up', 'down']) })),
  zValidator('param', z.object({ id: z.string() })),
  async function vote(c) {
    const configId = c.req.param('id')
    const { type } = c.req.valid('json')
    const db = c.get('createDb')()

    try {
      await service.voteOnPolicy(db, configId, type)
      return c.json({ success: true })
    } catch (e) {
      throw new HTTPException(500, {
        cause: e,
        message: 'Failed to vote on policy',
      })
    }
  }
)

policyRouter.post(
  '/:id/download',
  zValidator('param', z.object({ id: z.string() })),
  async function trackDownload(c) {
    const configId = c.req.param('id')
    const db = c.get('createDb')()

    try {
      await service.incrementDownload(db, configId)
      return c.json({ success: true })
    } catch (e) {
      throw new HTTPException(500, {
        cause: e,
        message: 'Failed to track download',
      })
    }
  }
)
