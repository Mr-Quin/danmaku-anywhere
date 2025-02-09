import type { Scope } from 'effect'
import { Console, Effect, Match } from 'effect'

import { State } from '../state'
import { HTTPError } from '../utils'

import { extractTitle } from './gemini'

export const handleGemini: Effect.Effect<
  Response,
  HTTPError,
  State | Scope.Scope
> = Effect.gen(function* () {
  yield* Effect.annotateLogsScoped({ path: 'gemini' })

  yield* Console.log('Handling Gemini request')

  const state = yield* State
  const { path } = yield* state.get

  return yield* Match.value(path).pipe(
    Match.when(
      (path) => path.replace('/gemini', '').startsWith('/extractTitle'),
      () => handleExtractTitle
    ),
    Match.orElse(() =>
      Console.error(`Invalid path: ${path}`).pipe(
        Effect.andThen(() => Effect.fail(new HTTPError(400, 'Bad Request')))
      )
    )
  )
})

const handleExtractTitle = Effect.gen(function* () {
  yield* Console.log('Handling extractTitle request')

  const state = yield* State
  const { ctx } = yield* state.get

  const { response, cache, cacheKey } = yield* extractTitle

  if (!cache) {
    yield* Console.log('Caching response for extractTitle')
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
  }

  return response
}).pipe(
  Effect.mapError((err) => {
    return new HTTPError(err.status ?? 400, err.message)
  })
)
