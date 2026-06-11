import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { describeRoute } from 'hono-openapi'
import { factory } from '@/factory'
import { useRateLimiter } from '@/middleware/rateLimit'
import { forwardToAxiom } from './axiom'
import { intakeBatchSchema, MAX_EVENT_BYTES, MAX_PAYLOAD_BYTES } from './schema'

export const intakeRouter = factory.createApp()

intakeRouter.post(
  '/',
  describeRoute({
    description: 'Ingest a batch of product analytics events',
    responses: {
      202: { description: 'Batch accepted for forwarding' },
      400: { description: 'Malformed batch' },
      413: { description: 'Batch or event too large' },
      429: { description: 'Rate limit exceeded' },
    },
  }),
  useRateLimiter({ rateLimiter: 'INTAKE_RATE_LIMITER' }),
  async (c, next) => {
    const contentLength = Number(c.req.header('content-length') ?? 0)
    if (contentLength > MAX_PAYLOAD_BYTES) {
      throw new HTTPException(413, { message: 'Payload too large' })
    }
    await next()
  },
  zValidator('json', intakeBatchSchema),
  async (c) => {
    const events = c.req.valid('json')

    const encoder = new TextEncoder()
    for (const event of events) {
      if (
        encoder.encode(JSON.stringify(event.properties)).length >
        MAX_EVENT_BYTES
      ) {
        throw new HTTPException(413, { message: 'Event properties too large' })
      }
    }

    const receivedAt = new Date().toISOString()
    const country = c.req.raw.cf?.country ?? null
    const enriched = events.map((event) => {
      return { ...event, receivedAt, country }
    })

    c.executionCtx.waitUntil(forwardToAxiom(c.env, enriched))

    return c.json({ success: true }, 202)
  }
)
