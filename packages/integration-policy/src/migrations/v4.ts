import { z } from 'zod'
import { getRandomUUID } from '../uuid.js'
import type { IntegrationV3 } from './v3.js'

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
    error: 'Invalid regex string',
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

const clickNavigationSchema = z.object({
  mode: z.literal('click'),
  selectors: z.array(selectorSchema).min(1),
})

const navigationSchema = z.discriminatedUnion('mode', [clickNavigationSchema])

const optionsSchema = z.object({
  autoAdvanceOnEnded: z.boolean(),
})

export const zIntegrationPolicyV4 = z.object({
  version: z.literal(4),
  title: z.object({
    selector: z.array(selectorSchema).min(1),
    regex: z.array(regexSchema),
  }),
  episode: matcherSchema,
  season: matcherSchema,
  episodeTitle: matcherSchema,
  nextEpisode: navigationSchema.optional(),
  prevEpisode: navigationSchema.optional(),
  options: optionsSchema,
})

export const zIntegrationV4 = z.object({
  version: z.literal(4),
  id: z
    .uuid()
    .optional()
    .prefault(() => getRandomUUID()),
  name: z.string().min(1),
  policy: zIntegrationPolicyV4,
})

export type IntegrationV4 = z.infer<typeof zIntegrationV4>

export type IntegrationPolicyV4 = z.infer<typeof zIntegrationPolicyV4>

export type IntegrationPolicyNavigation = z.infer<typeof navigationSchema>

export function migrateV3ToV4(data: IntegrationV3[]): IntegrationV4[] {
  return data.map((policy) => {
    return {
      ...policy,
      version: 4,
      policy: {
        ...policy.policy,
        version: 4,
        options: {
          autoAdvanceOnEnded: false,
        },
      },
    } satisfies IntegrationV4
  })
}
