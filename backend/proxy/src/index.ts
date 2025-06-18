import { Cause, Console, Effect, Match, Ref } from 'effect'

import { handleProxyDanDanPlay } from './danDanPlay'
import { handleGemini } from './gemini/router'
import { State, Store } from './state'
import { HTTPError, uriDecode } from './utils'

class InvalidOriginError {
  readonly _tag = 'InvalidOriginError'

  constructor(public readonly origin: string | null) {}
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const getResponse = Effect.gen(function* () {
      const state = yield* State

      if (
        env.LOCAL === '0' &&
        request.headers.get('Origin') !== env.ALLOWED_ORIGIN
      ) {
        return yield* Effect.fail(
          new InvalidOriginError(request.headers.get('Origin'))
        )
      }

      if (request.method === 'OPTIONS') {
        return yield* Effect.succeed(new Response(null, { status: 204 }))
      }

      // Globally cache GET requests
      if (request.method === 'GET') {
        const cached = yield* Effect.promise(() =>
          caches.default.match(request)
        )

        if (cached) {
          yield* Console.debug('Cache hit!')
          yield* state.setCacheHit(true)
          return cached
        }

        yield* Console.debug('Cache miss!')
      }

      const url = new URL(request.url)

      if (url.pathname.startsWith(env.BASE_URL)) {
        url.pathname = url.pathname.replace(env.BASE_URL, '')
      }

      const path = url.pathname

      yield* Console.debug(`Processing request for ${uriDecode(path)}`)
      yield* state.setPath(path)

      return yield* Match.value({
        path: path,
        method: request.method,
      }).pipe(
        Match.when(
          {
            method: (method) => method === 'POST',
            path: (p) => p.startsWith('/gemini'),
          },
          () => handleGemini
        ),
        Match.when(
          { path: (p) => p.startsWith('/api') },
          () => handleProxyDanDanPlay
        ),
        Match.orElse(() => Effect.fail(new HTTPError(400, 'Bad Request')))
      )
    }).pipe(
      Effect.tap(() => Console.log('Finished processing request')),
      Effect.scoped,
      // Handle errors
      Effect.tapError((err) => {
        if (err instanceof InvalidOriginError) {
          return Console.error(
            `Error processing request: Invalid origin: ${err.origin}, allowed origin: ${env.ALLOWED_ORIGIN}`
          )
        }
        return Console.error(
          `Error processing request: HTTP Error: ${err.status} ${err.message}`
        )
      }),
      Effect.catchAll((err) => {
        const message = err instanceof HTTPError ? err.message : 'Bad request'
        const status = err instanceof HTTPError ? err.status : 400

        return Effect.succeed(
          new Response(JSON.stringify({ message, success: false }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    )

    const processResponse = (res: Response) => {
      return Effect.gen(function* () {
        const shouldCache = request.method === 'GET' && res.status === 200

        const updatedRes = setCorsHeaders(res, env.ALLOWED_ORIGIN)

        if (shouldCache) {
          yield* Console.log(`Caching response for ${uriDecode(request.url)}`)
          ctx.waitUntil(caches.default.put(request, updatedRes.clone()))
        }

        return updatedRes
      })
    }

    const program = Effect.gen(function* () {
      const response = yield* getResponse
      const state = yield* State
      const { cacheHit } = yield* Ref.get(state.ref)

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
          yield* Console.error('Defect caught', defect)

          const message = yield* Match.value(defect).pipe(
            Match.when(Cause.isRuntimeException, (defect) => {
              return Effect.succeed(defect.message)
            }),
            Match.when(
              (defect: unknown) => defect instanceof Error,
              (defect) => {
                return Effect.succeed(defect.message)
              }
            ),
            Match.orElse(() => {
              return Effect.succeed('Unknown error')
            })
          )

          return new Response(
            JSON.stringify({
              message,
              success: false,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        })
      })
    )

    const programLive = program.pipe(
      Effect.provideServiceEffect(State, Store.Create(request, env, ctx))
    )

    return await Effect.runPromise(programLive)
  },
}

const setCorsHeaders = (response: Response, origin: string) => {
  const newRes = new Response(response.body, response)

  newRes.headers.set('Access-Control-Allow-Origin', origin)
  newRes.headers.set(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  newRes.headers.set('Access-Control-Max-Age', '86400')

  return newRes
}
