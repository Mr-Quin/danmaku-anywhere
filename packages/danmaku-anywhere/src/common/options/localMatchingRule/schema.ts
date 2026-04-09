import { z } from 'zod'

import type { Options } from '@/common/options/OptionsService/types'
import { PLACEHOLDER_RE } from './patternUtils'

const hasPlaceholder = (p: string) => {
  PLACEHOLDER_RE.lastIndex = 0
  return PLACEHOLDER_RE.test(p)
}

export const namingRuleSchema = z.object({
  folderPath: z.string(),
  title: z.string().min(1),
  pattern: z.string().min(1).refine(hasPlaceholder, {
    message: 'Pattern must contain {episode} or {episode:NNd} placeholder',
  }),
})

export type NamingRule = z.infer<typeof namingRuleSchema>

export const namingRuleOptionsSchema = z.object({
  rules: z.array(namingRuleSchema),
})

export type NamingRuleOptions = z.infer<typeof namingRuleOptionsSchema>

export type NamingRuleStore = Options<NamingRuleOptions>

/**
 * Render a naming rule pattern template with an episode number.
 */
export function renderNamingPattern(
  pattern: string,
  episodeNumber: number
): string {
  PLACEHOLDER_RE.lastIndex = 0
  return pattern.replace(PLACEHOLDER_RE, (_match, padWidth?: string) => {
    if (padWidth === undefined) {
      return String(episodeNumber)
    }
    return String(episodeNumber).padStart(Number(padWidth), '0')
  })
}
