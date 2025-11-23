import * as Sentry from '@sentry/cloudflare'
import type { Context } from 'hono'
import { factory } from '@/factory'
import { type SetCacheControlFn, useCache } from '@/middleware/cache'
import { md5, uriDecode } from '@/utils'

const registerEndpoints = [
  'register',
  'resetpassword',
  'findmyid',
  'login',
] as const

const isRegisterEndpoint = (path: string) => {
  return registerEndpoints.some((endpoint) => path.endsWith(endpoint))
}

const getCacheTime = (cacheControl?: string | null) => {
  if (!cacheControl) return null

  const parts = cacheControl.split(',')
  const maxAge = parts.find((part) => part.includes('max-age'))

  if (!maxAge) {
    return null
  }

  try {
    return Number.parseInt(maxAge.split('=')[1])
  } catch {
    return null
  }
}

const updateRequestBody = async (
  request: Request,
  appId: string,
  appSecret: string,
  usePassword: boolean
) => {
  if (!request.body) {
    return request
  }

  const requestBody: Record<string, string> = await request.json()
  const timestamp = Math.floor(Date.now() / 1000)

  // md5(`${appId}${email}${password}${screenName}${unixTimestamp}${appSecret}`)
  const message = usePassword
    ? `${appId}${requestBody.email}${requestBody.password}${requestBody.screenName}${timestamp}${requestBody.userName}${appSecret}`
    : `${appId}${requestBody.email}${requestBody.screenName}${timestamp}${requestBody.userName}${appSecret}`

  const hash = md5(message)

  requestBody.appId = appId
  requestBody.unixTimestamp = timestamp.toString()
  requestBody.hash = hash

  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(requestBody),
  })
}

const setCacheHeaders: SetCacheControlFn = (req, response) => {
  if (req.method === 'GET' && response.status === 200) {
    const cacheControl = response.headers.get('Cache-Control')
    const cacheTime = getCacheTime(cacheControl) ?? 1800

    if (cacheControl) {
      console.log(`Origin Cache-Control: ${cacheControl}`)
    }

    console.log(`Setting cache time to ${cacheTime}`)
    response.headers.set('Cache-Control', `s-maxage=${cacheTime}`)
  }
}

const verifyPathQuery = factory.createMiddleware(async (c: Context, next) => {
  const path = c.req.query('path')

  if (!path) {
    return c.json({ error: 'Missing required "path" query parameter' }, 400)
  }

  // path looks like /v2/endpoint/..., we want to extract the endpoint
  Sentry.setTag('ddp.endpoint', path.split('/')[2])

  return next()
})

export const danDanPlay = factory.createApp()

danDanPlay.use('*', useCache({ setCacheControl: setCacheHeaders }))

danDanPlay.all('*', verifyPathQuery, async (c) => {
  const env = c.env

  const encodedPath = c.req.query('path') as string

  const path = decodeURIComponent(encodedPath).replace(/^\/+/, '')

  const targetUrl = `${env.DANDANPLAY_API_HOST}/api/${path}`
  console.log(`DanDanPlay: ${uriDecode(targetUrl)}`)

  let ddpRequest = new Request(targetUrl, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  })

  const DANDANPLAY_APP_SECRET = await env.DANDANPLAY_APP_SECRET.get()
  // Update request body for register endpoints
  if (c.req.method === 'POST' && isRegisterEndpoint(path)) {
    console.log(`Updating request body for ${path}`)
    ddpRequest = await updateRequestBody(
      ddpRequest,
      env.DANDANPLAY_APP_ID,
      DANDANPLAY_APP_SECRET,
      path !== 'findmyid'
    )
  }

  // Add DanDanPlay API credentials
  ddpRequest.headers.set('X-AppId', env.DANDANPLAY_APP_ID)
  ddpRequest.headers.set('X-AppSecret', DANDANPLAY_APP_SECRET)

  return fetch(ddpRequest)
})
