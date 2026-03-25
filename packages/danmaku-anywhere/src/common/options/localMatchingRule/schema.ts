import { z } from 'zod'

import type { Options } from '@/common/options/OptionsService/types'

export const localMatchingRuleSchema = z.object({
  mapKey: z.string().min(1),
  pattern: z.string().min(1),
})

export type LocalMatchingRule = z.infer<typeof localMatchingRuleSchema>

export const localMatchingRuleOptionsSchema = z.object({
  rules: z.array(localMatchingRuleSchema),
})

export type LocalMatchingRuleOptions = z.infer<
  typeof localMatchingRuleOptionsSchema
>

export type LocalMatchingRuleOptionsOptions = Options<LocalMatchingRuleOptions>

/**
 * Render a local matching pattern template with an episode number.
 *
 * Supported placeholders:
 * - {episode}      → raw number, e.g. "3"
 * - {episode:02d}  → zero-padded to 2 digits, e.g. "03"
 * - {episode:03d}  → zero-padded to 3 digits, e.g. "003"
 */
export function renderLocalMatchingPattern(
  pattern: string,
  episodeNumber: number
): string {
  return pattern.replace(
    /\{episode(?::(\d+)d)?\}/g,
    (_match, padWidth?: string) => {
      if (padWidth === undefined) {
        return String(episodeNumber)
      }
      return String(episodeNumber).padStart(Number(padWidth), '0')
    }
  )
}
