import { getRandomUUID } from '@/common/utils/utils'
import { z } from 'zod'

const regexString = z.string().refine(
  (v) => {
    if (v.length === 0) return true
    try {
      new RegExp(v)
      return true
    } catch {
      return false
    }
  },
  {
    message: 'Invalid regex string',
  }
)

const selectorSchema = z.object({
  value: z.string(),
  quick: z.boolean(),
})

const regexSchema = z.object({
  value: regexString,
  quick: z.boolean(),
})

const matcherSchema = z.object({
  selector: z.array(selectorSchema),
  regex: z.array(regexSchema),
})

const optionsSchema = z.object({
  titleOnly: z.boolean(),
  useAI: z.boolean(),
  dandanplay: z.object({
    useMatchApi: z.boolean(),
  }),
})

export const zIntegrationPolicy = z.object({
  title: z.object({
    selector: z.array(selectorSchema).min(1),
    regex: z.array(regexSchema).min(1),
  }),
  episode: matcherSchema,
  season: matcherSchema,
  episodeTitle: matcherSchema,
  options: optionsSchema,
})

export type IntegrationPolicy = z.infer<typeof zIntegrationPolicy>

export const zIntegration = z.object({
  id: z.string().uuid().optional().default(getRandomUUID()),
  name: z.string().min(1),
  policy: zIntegrationPolicy,
})

export type IntegrationInput = z.input<typeof zIntegration>

export type Integration = z.output<typeof zIntegration>

export interface IntegrationV1 {
  name: string
  id: string
  policy: {
    title: {
      selector: string[]
      regex: string[]
    }
    episode: {
      selector: string[]
      regex: string[]
    }
    season: {
      selector: string[]
      regex: string[]
    }
    episodeTitle: {
      selector: string[]
      regex: string[]
    }
    titleOnly: boolean
  }
}

export interface IntegrationV2 {
  name: string
  id: string
  policy: {
    title: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    episode: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    season: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    episodeTitle: {
      selector: { value: string; quick: boolean }[]
      regex: { value: string; quick: boolean }[]
    }
    options: {
      titleOnly: boolean
      dandanplay: {
        useMatchApi: boolean
      }
    }
  }
}

export const createIntegrationInput = (name = ''): IntegrationInput => {
  return {
    name: name,
    policy: {
      title: {
        selector: [{ value: '', quick: false }],
        regex: [{ value: '', quick: false }],
      },
      episode: {
        selector: [{ value: '', quick: false }],
        regex: [{ value: '', quick: false }],
      },
      season: {
        selector: [{ value: '', quick: false }],
        regex: [{ value: '', quick: false }],
      },
      episodeTitle: {
        selector: [{ value: '', quick: false }],
        regex: [{ value: '', quick: false }],
      },
      options: {
        titleOnly: false,
        useAI: true,
        dandanplay: {
          useMatchApi: false,
        },
      },
    },
  }
}
