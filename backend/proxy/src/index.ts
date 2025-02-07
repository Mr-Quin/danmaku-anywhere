import crypto from 'crypto'

import { Cause, Console, Context, Effect, pipe, Ref } from 'effect'

class InvalidOriginError {
  readonly _tag = 'InvalidOriginError'
}

class Store {
  public cacheHit: Ref.Ref<boolean>

  constructor() {
    this.cacheHit = Effect.runSync(Ref.make(false))
  }
}

class State extends Context.Tag('State')<State, Store>() {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const getResponse = Effect.gen(function* () {
      const state = yield* State

      if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
        return yield* Effect.fail(new InvalidOriginError())
      }

      if (request.method === 'OPTIONS') {
        return yield* Effect.succeed(new Response(null, { status: 204 }))
      }

      const cached = yield* Effect.promise(() => caches.default.match(request))

      if (cached) {
        yield* Console.debug(`Cache hit!`)
        yield* Ref.update(state.cacheHit, () => true)
        return cached
      }

      yield* Console.debug(`Cache miss!`)

      return yield* handleProxyDanDanPlay(request, env)
    }).pipe(
      // Handle errors
      Effect.tapErrorTag('InvalidOriginError', () => {
        return Console.error('Invalid origin')
      }),
      Effect.catchTag('InvalidOriginError', () => {
        return Effect.succeed(new Response(null, { status: 400 }))
      })
    )

    const processResponse = (res: Response) => {
      return Effect.gen(function* () {
        const shouldCache = request.method === 'GET' && res.status === 200

        const updatedRes = setCorsHeaders(res, env.ALLOWED_ORIGIN)

        if (shouldCache) {
          yield* Console.log(`Caching response for ${uriDecode(request.url)}`)
          yield* Effect.tryPromise(() =>
            caches.default.put(request, updatedRes.clone())
          ).pipe(Effect.catchAllCause(() => Console.error('Failed to cache')))
        }

        return updatedRes
      })
    }

    const program = Effect.gen(function* () {
      const response = yield* getResponse
      const state = yield* State
      const cacheHit = yield* Ref.get(state.cacheHit)

      if (cacheHit) {
        yield* Console.log(
          `Returning cached response for ${uriDecode(request.url)}`
        )
        return response
      }

      return yield* processResponse(response)
    }).pipe(
      Effect.catchAllDefect((defect) => {
        return Effect.gen(function* () {
          if (Cause.isRuntimeException(defect)) {
            yield* Console.log(
              `RuntimeException defect caught: ${defect.message}`
            )
            return yield* Effect.succeed(
              new Response(defect.message, { status: 500 })
            )
          }
          yield* Console.log('Unknown defect caught.', defect)

          return yield* Effect.succeed(new Response(null, { status: 500 }))
        })
      })
    )

    const programLive = program.pipe(
      Effect.provideServiceEffect(
        State,
        Effect.sync(() => new Store())
      )
    )

    return await Effect.runPromise(programLive)
  },
}

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

const setCorsHeaders = (response: Response, origin: string) => {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  response.headers.set('Access-Control-Max-Age', '86400')

  return response
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

const uriDecode = (url: string) => {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

function handleProxyDanDanPlay(
  request: Request,
  env: Env
): Effect.Effect<Response, never, never> {
  return Effect.gen(function* () {
    const url = new URL(request.url)

    const path = url.pathname.includes(env.BASE_URL)
      ? url.pathname.replace(env.BASE_URL, '')
      : url.pathname

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
