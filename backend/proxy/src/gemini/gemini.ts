import type {
  GenerationConfig,
  GoogleGenerativeAIFetchError,
} from '@google/generative-ai'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { Console, Effect, Schema } from 'effect'

import { State } from '../state'
import { HTTPError, getCacheKey } from '../utils'

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

const ExtractTitleRequest = Schema.Struct({
  input: Schema.String.pipe(
    Schema.filter((s) => {
      if (s.length > 4096) return 'input is too long'
      if (s.length < 10) return 'input is too short'
      return true
    })
  ),
})

export const extractTitle: Effect.Effect<
  {
    response: Response
    cache: boolean
    cacheKey: Request
  },
  GoogleGenerativeAIFetchError | HTTPError,
  State
> = Effect.gen(function* () {
  const state = yield* State
  const { env, request } = yield* state.get

  const json = yield* Effect.orElseFail(
    Effect.tryPromise(() => request.json()),
    () => {
      return new HTTPError(400, 'Invalid JSON')
    }
  )

  const { input } = yield* Schema.decodeUnknown(ExtractTitleRequest)(json).pipe(
    Effect.mapError((err) => new HTTPError(400, err.message))
  )

  const cacheKey = getCacheKey(request, env, input)

  const cache = caches.default
  const cachedResponse = yield* Effect.promise(() => cache.match(cacheKey))

  if (cachedResponse) {
    yield* Console.log('extractTitle cache hit!')
    return {
      response: cachedResponse,
      cache: true,
      cacheKey,
    }
  }

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
  })

  yield* Console.log('Model response:', {
    meta: result.response.usageMetadata,
    response: result.response.text(),
  })

  const res = new Response(
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

  return {
    response: res,
    cache: false,
    cacheKey,
  }
})
