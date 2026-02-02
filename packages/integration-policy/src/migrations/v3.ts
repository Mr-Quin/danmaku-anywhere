import { z } from 'zod'
import { getRandomUUID } from '../uuid.js'
import type { IntegrationV2 } from './v2.js'

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

const optionsSchema = z.object({
  // no options
})

export const zIntegrationPolicyV3 = z.object({
  version: z.literal(3),
  title: z.object({
    selector: z.array(selectorSchema).min(1),
    regex: z.array(regexSchema),
  }),
  episode: matcherSchema,
  season: matcherSchema,
  episodeTitle: matcherSchema,
  options: optionsSchema,
})

export const zIntegrationV3 = z.object({
  version: z.literal(3),
  id: z
    .uuid()
    .optional()
    .prefault(() => getRandomUUID()),
  name: z.string().min(1),
  policy: zIntegrationPolicyV3,
})

export type IntegrationPolicySelector = z.input<typeof selectorSchema>

export type IntegrationV3 = z.infer<typeof zIntegrationV3>

export type IntegrationPolicyV3 = z.infer<typeof zIntegrationPolicyV3>

export function migrateV2ToV3(data: IntegrationV2[]): IntegrationV3[] {
  return data.map((policy) => {
    return {
      version: 3,
      ...policy,
      policy: {
        version: 3,
        ...policy.policy,
        options: {},
      },
    } satisfies IntegrationV3
  })
}
