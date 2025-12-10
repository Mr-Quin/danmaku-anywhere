import { chineseToNumber } from './chineseToNumber'
import { PATTERNS } from './mediaRegexPatterns'
import type { ExtractorMatch } from './types'

export const RegexUtils = {
  // for running user-provided regexes
  runUserRegex(text: string, regexes: string[]): ExtractorMatch | null {
    if (!regexes.length) {
      return null
    }

    for (const r of regexes) {
      try {
        const reg = new RegExp(r)
        const m = reg.exec(text)
        if (m) {
          const val = m[1] ?? m[0]
          return {
            value: val,
            raw: m[0],
            index: m.index,
            groups: m.groups,
            regex: r.toString(),
          }
        }
      } catch {
        continue
      }
    }
    return null
  },

  findCommonSeason(text: string): ExtractorMatch | null {
    return this.runPatterns(text, PATTERNS.SEASON)
  },

  findCommonEpisode(text: string): ExtractorMatch | null {
    return this.runPatterns(text, PATTERNS.EPISODE)
  },

  // for running internal patterns
  runPatterns(text: string, patterns: RegExp[]): ExtractorMatch | null {
    for (const pat of patterns) {
      const m = pat.exec(text)
      if (m) {
        const val = chineseToNumber(m[1])
        if (val !== null) {
          return {
            value: val,
            raw: m[0].trim(),
            index: m.index,
            regex: pat.toString(),
          }
        }
      }
    }
    return null
  },
}

export function sortSelectors(
  selectors: { value: string; quick: boolean }[]
): string[] {
  return selectors
    .sort((a, b) => {
      if (a.quick === b.quick) return 0
      return a.quick ? -1 : 1
    })
    .map((s) => s.value)
}
