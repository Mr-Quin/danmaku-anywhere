import type { HonoRequest } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'
import { factory } from '@/factory'
import { requestBypassesCache, useCache } from '@/middleware/cache'

export const manifestRouter = factory.createApp()

const dangoBaseUrl =
  'https://raw.githubusercontent.com/Mr-Quin/dango/main/packages/dango-manifests'

const filePattern = /^src\/manifests\/[\w.-]+\.json$/

const cacheMaxAge = 15 * 60

// The upstream sends max-age=300, which Cloudflare honors on the Worker's own
// subrequest, so a forced refresh that got past useCache could still be handed
// bytes up to five minutes old. 'no-store' is the documented way to make the
// runtime neither read nor write that cache for one subrequest.
function fetchUpstream(req: HonoRequest, url: string): Promise<Response> {
  if (!requestBypassesCache(req)) {
    return fetch(url)
  }
  return fetch(new Request(url, { cache: 'no-store' }))
}

manifestRouter.get(
  '/',
  describeRoute({
    description: 'Get dango manifest catalog',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(
              z.object({
                packageVersion: z.string(),
                manifests: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    version: z.string(),
                    apiVersion: z.number(),
                    file: z.string(),
                  })
                ),
              })
            ),
          },
        },
      },
    },
  }),
  useCache({
    maxAge: cacheMaxAge,
  }),
  async (c) => {
    return await fetchUpstream(c.req, `${dangoBaseUrl}/catalog.json`)
  }
)

manifestRouter.get(
  '/file',
  validator(
    'query',
    z.object({
      file: z.string().regex(filePattern),
    })
  ),
  describeRoute({
    description: 'Get a dango manifest file',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: resolver(z.object({}).passthrough()),
          },
        },
      },
    },
  }),
  useCache({
    maxAge: cacheMaxAge,
  }),
  async (c) => {
    const { file } = c.req.valid('query')
    return await fetchUpstream(c.req, `${dangoBaseUrl}/${file}`)
  }
)
