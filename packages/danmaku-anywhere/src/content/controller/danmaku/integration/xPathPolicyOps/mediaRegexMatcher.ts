import { chineseToNumber } from './chineseToNumber'
import { PATTERNS } from './mediaRegexPatterns'
import type { ExtractorMatch } from './types'

export const RegexUtils = {
  runUserRegex(text: string, regexes: string[]): ExtractorMatch | null {
    // If it's undefined or null, return null early
    if (!regexes) return null

    for (const r of regexes) {
      try {
        const reg = new RegExp(r)
        const m = reg.exec(text)
        if (m) {
          const val = m[1] ?? m[0]
          return { value: val, raw: m[0], index: m.index }
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

  runPatterns(text: string, patterns: RegExp[]): ExtractorMatch | null {
    for (const pat of patterns) {
      const m = pat.exec(text)
      if (m) {
        // Handle Chinese conversion here if needed
        const val = this.parseNumberOrChinese(m[1])
        if (val !== null) {
          return { value: val, raw: m[0].trim(), index: m.index }
        }
      }
    }
    return null
  },

  parseNumberOrChinese(val: string): number | null {
    // 1. Try simple int parse
    const num = Number.parseInt(val, 10)
    if (!Number.isNaN(num)) {
      return num
    }

    // 2. Try Chinese
    return chineseToNumber(val)
  },

  // === Legacy Adapters for Compatibility ===

  extractSeason(text: string, userRegex?: string[]): ExtractorMatch | null {
    if (userRegex) {
      const regexes = userRegex
      const m = this.runUserRegex(text, regexes)
      if (m) return m
    }
    return this.findCommonSeason(text)
  },

  extractEpisodeNumber(
    text: string,
    userRegex?: string[]
  ): ExtractorMatch | null {
    if (userRegex) {
      const regexes = userRegex
      const m = this.runUserRegex(text, regexes)
      if (m) {
        // Legacy behavior: must parse to number
        const valStr = m.value.toString()
        const val = Number.parseInt(valStr, 10)
        if (!Number.isNaN(val)) {
          return { ...m, value: val }
        }
        const cn = chineseToNumber(valStr)
        if (cn !== null) {
          return { ...m, value: cn }
        }
        return null
      }
    }
    return this.findCommonEpisode(text)
  },

  /**
   * Legacy Adaptor for old code usage in tests or other places
   */
  extractTitle(text: string, userRegex?: string[]): string | null {
    if (!text) {
      return null
    }
    if (userRegex) {
      const match = this.runUserRegex(text, userRegex)
      if (match) return match.value.toString().trim()
    }
    return text.trim()
  },

  // Legacy stubs
  parseMediaString(text: string, regex: string): string | undefined {
    try {
      const r = new RegExp(regex)
      const m = r.exec(text)
      if (m && m[1]) return m[1]
    } catch {
      /* ignore */
    }
    return undefined
  },

  parseMultipleRegex<T>(
    parser: (text: string, regex: string) => T | undefined,
    text: string,
    regex?: string | { value: string }[]
  ): T | undefined {
    if (!regex) return undefined
    const regexes = Array.isArray(regex) ? regex.map((r) => r.value) : [regex]

    for (const r of regexes) {
      const res = parser(text, r)
      if (res !== undefined) return res
    }
    return undefined
  },
}

// Retain Exports
export const parseMediaString = RegexUtils.parseMediaString
export const parseMultipleRegex = RegexUtils.parseMultipleRegex

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
