import crypto from 'crypto'

import { Console, Effect, pipe } from 'effect'

import { State } from './state'
import { uriDecode } from './utils'

const getCacheTime = (cacheControl: string) => {
  const parts = cacheControl.split(',')

  const maxAge = parts.find((part) => part.includes('max-age'))

  if (!maxAge) {
    return null
  }

  try {
    return parseInt(maxAge.split('=')[1])
  } catch {
    return null
  }
}

const registerEndpoints = [
  'register',
  'resetpassword',
  'findmyid',
  'login',
] as const

const isRegisterEndpoint = (path: string) => {
  return registerEndpoints.some((endpoint) => path.endsWith(endpoint))
}

const updateRequestBody = async (
  request: Request,
  env: Env,
  usePassword: boolean
) => {
  if (!request.body) {
    return request
  }

  const requestBody: Record<string, string> = await request.json()

  const timestamp = Math.floor(Date.now() / 1000)

  // md5(`${appId}${email}${password}${screenName}${unixTimestamp}${appSecret}`)
  const message = usePassword
    ? `${env.DANDANPLAY_APP_ID}${requestBody.email}${requestBody.password}${requestBody.screenName}${timestamp}${requestBody.userName}${env.DANDANPLAY_APP_SECRET}`
    : `${env.DANDANPLAY_APP_ID}${requestBody.email}${requestBody.screenName}${timestamp}${requestBody.userName}${env.DANDANPLAY_APP_SECRET}`

  const hash = crypto.createHash('md5').update(message).digest('hex')

  requestBody.appId = env.DANDANPLAY_APP_ID
  requestBody.unixTimestamp = timestamp.toString()
  requestBody.hash = hash

  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(requestBody),
  })
}

export const handleProxyDanDanPlay = (
  request: Request,
  env: Env
): Effect.Effect<Response, never, State> => {
  return Effect.gen(function* () {
    const state = yield* State
    const { path } = yield* state.get

    const url = new URL(request.url)

    const targetUrl = `${env.DANDANPLAY_API_HOST}${path}${url.search}`

    yield* Console.log(`DanDanPlay: ${uriDecode(targetUrl)}`)

    const newRequest = yield* pipe(
      Effect.succeed(
        new Request(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        })
      ),
      Effect.andThen((req) => {
        return Effect.gen(function* () {
          if (request.method === 'POST' && isRegisterEndpoint(path)) {
            yield* Console.log(`Updating request body for ${path}`)
            return yield* Effect.promise(() =>
              updateRequestBody(req, env, path !== 'findmyid')
            )
          }
          return req
        })
      })
    )

    newRequest.headers.set('X-AppId', env.DANDANPLAY_APP_ID)
    newRequest.headers.set('X-AppSecret', env.DANDANPLAY_APP_SECRET)

    const response = yield* Effect.promise(() => fetch(newRequest))
    const newRes = new Response(response.body, response)

    if (newRequest.method === 'GET' && newRes.status === 200) {
      const cacheControl = newRes.headers.get('Cache-Control')
      const cacheTime = cacheControl
        ? (getCacheTime(cacheControl) ?? 1800)
        : 1800

      if (cacheControl) {
        yield* Console.log(`Origin Cache-Control: ${cacheControl}`)
      }

      yield* Console.log(`Setting cache time to ${cacheTime}`)
      newRes.headers.set('Cache-Control', `s-maxage=${cacheTime}`)
    }

    return newRes
  })
}
