import type { Context } from 'hono'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ReleaseManager } from '../core/manager.js'
import type { ReleaseManagerError } from '../core/types.js'

async function requireTag(c: Context): Promise<string | undefined> {
  const body = await c.req
    .json<{ tag?: string }>()
    .catch((): { tag?: string } => ({}))
  const tag = body.tag?.trim()
  return tag ? tag : undefined
}

function isLoopbackHost(host: string | undefined): boolean {
  if (!host) {
    return false
  }
  const hostname = host.split(':')[0]
  return hostname === '127.0.0.1' || hostname === 'localhost'
}

function statusFor(error: ReleaseManagerError): ContentfulStatusCode {
  switch (error.kind) {
    case 'auth':
      return error.status as ContentfulStatusCode
    case 'rate-limited':
      return 429
    case 'not-found':
      return 404
    case 'conflict':
      return 409
    case 'invalid':
      return 400
    case 'network':
      return 502
    case 'swap':
      return 500
    default:
      return 500
  }
}

export function createApp(manager: ReleaseManager): Hono {
  const app = new Hono()

  app.use('/*', async (c, next) => {
    if (!isLoopbackHost(c.req.header('Host'))) {
      return c.json({ error: 'forbidden host' }, 403)
    }
    return next()
  })

  app.get('/api/state', async (c) => {
    return c.json(await manager.getState())
  })

  app.get('/api/releases', async (c) => {
    const result = await manager.listReleases()
    if (!result.success) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }
    return c.json(result.data)
  })

  app.post('/api/builds/download', async (c) => {
    const tag = await requireTag(c)
    if (!tag) {
      return c.json({ error: 'tag is required' }, 400)
    }
    const result = await manager.downloadBuild(tag)
    if (!result.success) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }
    return c.json(result.data)
  })

  app.post('/api/active', async (c) => {
    const tag = await requireTag(c)
    if (!tag) {
      return c.json({ error: 'tag is required' }, 400)
    }
    const result = await manager.setActive(tag)
    if (!result.success) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }
    return c.json(result.data)
  })

  app.delete('/api/builds/:tag', async (c) => {
    const tag = c.req.param('tag').trim()
    if (!tag) {
      return c.json({ error: 'tag is required' }, 400)
    }
    const result = await manager.removeBuild(tag)
    if (!result.success) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }
    return c.json(result.data)
  })

  app.patch('/api/settings', async (c) => {
    const body = await c.req
      .json<{ githubToken?: string }>()
      .catch((): { githubToken?: string } => ({}))
    const state = await manager.updateToken(body.githubToken ?? '')
    return c.json(state)
  })

  return app
}
