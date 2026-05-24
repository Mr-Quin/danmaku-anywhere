import { z } from 'zod'
import { getRandomUUID } from '@/common/utils/utils'

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
  autoAdvanceOnEnded: z.boolean().default(false),
  skipPercentage: z.number().min(0).max(1).default(0),
  minVideoDuration: z.number().int().nonnegative().default(30),
})

export const zIntegrationPolicy = z.object({
  version: z.literal(4),
  title: z.object({
    selector: z.array(selectorSchema).min(1),
    regex: z.array(regexSchema),
  }),
  episode: matcherSchema,
  season: matcherSchema,
  episodeTitle: matcherSchema,
  nextEpisode: z.array(selectorSchema).min(1).optional(),
  prevEpisode: z.array(selectorSchema).min(1).optional(),
  options: optionsSchema,
})

export type IntegrationPolicy = z.infer<typeof zIntegrationPolicy>

export type IntegrationPolicySelector = z.input<typeof selectorSchema>

export const zIntegration = z.object({
  version: z.literal(4),
  id: z
    .uuid()
    .optional()
    .prefault(() => getRandomUUID()),
  name: z.string().min(1),
  policy: zIntegrationPolicy,
})

export type IntegrationInput = z.input<typeof zIntegration>

export type Integration = z.output<typeof zIntegration>
