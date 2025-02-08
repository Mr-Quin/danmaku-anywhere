import { Cause, Console, Effect, Match, Ref } from 'effect'

import { handleProxyDanDanPlay } from './danDanPlay'
import { handleGemini } from './gemini'
import { State, Store } from './state'
import { uriDecode } from './utils'

class InvalidOriginError {
  readonly _tag = 'InvalidOriginError'
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
        return yield* Effect.fail(new InvalidOriginError())
      }

      if (request.method === 'OPTIONS') {
        return yield* Effect.succeed(new Response(null, { status: 204 }))
      }

      const cached = yield* Effect.promise(() => caches.default.match(request))

      if (cached) {
        yield* Console.debug(`Cache hit!`)
        yield* state.setCacheHit(true)
        return cached
      }

      yield* Console.debug(`Cache miss!`)

      const url = new URL(request.url)

      const path = url.pathname.includes(env.BASE_URL)
        ? url.pathname.replace(env.BASE_URL, '')
        : url.pathname

      yield* state.setPath(path)

      return yield* Match.value({
        path: path,
        method: request.method,
      }).pipe(
        Match.when(
          { method: (m) => m === 'POST', path: (p) => p.startsWith('/gemini') },
          () => handleGemini(request, env)
        ),
        Match.when({ path: (p) => p.startsWith('/api') }, () =>
          handleProxyDanDanPlay(request, env)
        ),
        Match.orElse(() => Effect.succeed(new Response(null, { status: 404 })))
      )
    }).pipe(
      // Handle errors
      Effect.tapError((err) => {
        switch (err._tag) {
          case 'InvalidOriginError':
            return Console.error('Invalid origin')
        }
      }),
      Effect.catchAll(() => {
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
      Effect.provideServiceEffect(State, Store.Create())
    )

    return await Effect.runPromise(programLive)
  },
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
