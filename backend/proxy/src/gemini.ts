import type { GenerationConfig } from '@google/generative-ai'
import {
  GoogleGenerativeAI,
  SchemaType,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai'
import { Console, Effect, Match, Schema } from 'effect'

import { State } from './state'

const prompt =
  'Given the HTML below, infer the currently playing show, and return the following information about the show:\ntitle: The title of the show, do not include season or episode number\nseason: The season of the show, if available. The season may not be numeric.\nepisode: The episode number. Return 1 if not available.\naltTitles: Any known alternative titles of the show, for example in other languages\nepisodeTitle: The title of the single episode, if available\n\nIf no show is detected, return an empty title'

const generationConfig: GenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
  responseMimeType: 'application/json',
  responseSchema: {
    type: SchemaType.OBJECT,
    properties: {
      title: {
        type: SchemaType.STRING,
      },
      episode: {
        type: SchemaType.NUMBER,
      },
      season: {
        type: SchemaType.STRING,
      },
      altTitles: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
      },
      episodeTitle: {
        type: SchemaType.STRING,
      },
    },
    required: ['title', 'episode'],
  },
}

class HTTPError {
  readonly _tag = 'HTTPError'

  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}

export const handleGemini = (
  request: Request,
  env: Env
): Effect.Effect<Response, never, State> => {
  return Effect.gen(function* () {
    const state = yield* State
    const { path } = yield* state.get

    const body = yield* Effect.orElseFail(
      Effect.tryPromise(() => request.json()),
      () => {
        return { message: 'invalid JSON' }
      }
    )

    return yield* Match.value(path).pipe(
      Match.when(
        (path) => path.includes('/extractTitle'),
        () => {
          return Schema.decodeUnknown(ExtractTitleRequest)(body).pipe(
            Effect.tap(() => Console.log('ExtractTitleRequest')),
            Effect.andThen((res) => handleMatchTitle(request, env, res.input))
          )
        }
      ),
      Match.orElse(() =>
        Effect.succeed(
          new Response(null, {
            status: 404,
          })
        )
      )
    )
  }).pipe(
    Effect.tapError((err) => {
      return Console.error(err)
    }),
    Effect.catchAll((err) => {
      return Effect.succeed(
        new Response(JSON.stringify({ message: err.message, success: false }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  )
}

const ExtractTitleRequest = Schema.Struct({
  input: Schema.String.pipe(
    Schema.filter((s) => {
      if (s.length > 4096) return 'input is too long'
      if (s.length < 10) return 'input is too short'
      return true
    })
  ),
})

const handleMatchTitle = (request: Request, env: Env, input: string) => {
  return Effect.gen(function* () {
    const apiKey = env.GEMINI_API_KEY
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: prompt,
    })

    const session = model.startChat({
      generationConfig,
      history: [],
    })

    yield* Console.log('Sending message to model', input)

    const result = yield* Effect.tryPromise(() => {
      return session.sendMessage(input)
    }).pipe(
      Effect.tapError((err) =>
        Console.error('Error sending message to model', err)
      ),
      Effect.mapError((err) => {
        if (err.error instanceof GoogleGenerativeAIFetchError) {
          if (err.error.status) {
            return new HTTPError(err.error.status, err.error.message)
          }
        }
        return new Error('Failed to send message to model')
      })
    )

    yield* Console.log('Response:', {
      meta: result.response.usageMetadata,
      response: result.response.text(),
    })

    return new Response(
      JSON.stringify({
        result: JSON.parse(result.response.text()),
        success: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${60 * 60 * 24}`,
        },
      }
    )
  })
}
