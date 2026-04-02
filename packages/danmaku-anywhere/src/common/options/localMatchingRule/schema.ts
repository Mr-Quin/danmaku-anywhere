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

export type LocalMatchingRuleStore = Options<LocalMatchingRuleOptions>

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

/**
 * Convert a pattern template into a regex that captures the episode number.
 * Returns null if the pattern contains no {episode} placeholder.
 *
 * Example: "Show S01E{episode:02d}.xml" → /^Show S01E(\d+)\.xml$/
 */
export function patternToRegex(pattern: string): RegExp | null {
  if (!pattern.includes('{episode')) {
    return null
  }

  // Escape regex special chars, but leave our placeholders intact
  // We split on placeholders, escape each literal segment, then rejoin
  const parts = pattern.split(/\{episode(?::\d+d)?\}/g)
  const escaped = parts.map((part) => {
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })
  return new RegExp(`^${escaped.join('(\\d+)')}$`)
}
