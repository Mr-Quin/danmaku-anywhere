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

const matcher = z.object({
  selector: z.array(z.string()),
  regex: z.array(regexString),
})

export const integrationPolicySchema = z.object({
  title: z.object({
    selector: z.array(z.string().min(1)).min(1),
    regex: z.array(regexString).min(1),
  }),
  titleOnly: z.boolean(),
  episode: matcher,
  season: matcher,
  episodeTitle: matcher,
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

export const createIntegrationInput = (
  policy?: Integration
): IntegrationInput => {
  if (policy) return policy

  return {
    name: '',
    policy: {
      title: {
        selector: [''],
        regex: [''],
      },
      episode: {
        selector: [''],
        regex: [''],
      },
      season: {
        selector: [''],
        regex: [''],
      },
      episodeTitle: {
        selector: [''],
        regex: [''],
      },
      titleOnly: true,
    },
  }
}
