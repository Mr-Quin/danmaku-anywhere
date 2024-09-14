import { z } from 'zod'

import { getRandomUUID } from '@/common/utils/utils'

const xpathSelector = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => {
    if (typeof val === 'string') {
      return [val]
    }
    return val
  })

export const xpathPolicySchema = z.object({
  title: xpathSelector,
  episode: xpathSelector,
  season: xpathSelector,
  titleRegex: z.string().default('.+'),
  episodeRegex: z.string().default('\\d+'),
  seasonRegex: z.string().default('\\d+'),
})

export type XPathPolicy = z.infer<typeof xpathPolicySchema>

export const xpathPolicyItemSchema = z.object({
  name: z.string(),
  policy: xpathPolicySchema,
  id: z.string().uuid().optional().default(getRandomUUID),
})

export type XPathPolicyItem = z.infer<typeof xpathPolicyItemSchema>
