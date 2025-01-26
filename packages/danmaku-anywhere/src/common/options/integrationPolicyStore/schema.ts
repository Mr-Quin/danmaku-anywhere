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
  quick: z.boolean().default(false),
})

const regexSchema = z.object({
  value: regexString,
  quick: z.boolean().default(false),
})

const matcherSchema = z.object({
  selector: z.array(selectorSchema),
  regex: z.array(regexSchema),
})

const optionsSchema = z.object({
  titleOnly: z.boolean(),
  dandanplay: z.object({
    useMatchApi: z.boolean(),
  }),
})

export const integrationPolicySchema = z.object({
  title: z.object({
    selector: z.array(selectorSchema).min(1),
    regex: z.array(regexSchema).min(1),
  }),
  episode: matcherSchema,
  season: matcherSchema,
  episodeTitle: matcherSchema,
  options: optionsSchema,
})

export type IntegrationPolicy = z.infer<typeof integrationPolicySchema>

export const integrationInputSchema = z.object({
  name: z.string().min(1),
  policy: integrationPolicySchema,
  // Fields from import
  author: z.string().optional(),
  hash: z.string().optional(),
})

export type IntegrationInput = z.infer<typeof integrationInputSchema>

export type Integration = IntegrationInput & {
  id: string
}

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

export const createIntegrationInput = (
  policy?: Integration
): IntegrationInput => {
  if (policy) return policy

  return {
    name: '',
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
        dandanplay: {
          useMatchApi: false,
        },
      },
    },
  }
}
