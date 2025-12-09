import { chineseToNumber } from './chineseToNumber'

export interface RegexMatchResult {
  value: string | number
  raw: string
}

function regexMatchWithGroup(
  text: string,
  regex: string
): [string, string] | null {
  try {
    const r = new RegExp(regex)
    const m = r.exec(text)
    if (m) {
      // prefer the first group if available, otherwise use the full match
      const matched = m[1] ?? m[0]
      return [matched, m[0]]
    }
  } catch {
    // ignore
  }
  return null
}

export const RegexUtils = {
  /**
   * Parse regex that might return a string or number.
   * @deprecated primarily use specific extractors below
   */
  parseMediaString(text: string, regex: string): string | undefined {
    // Legacy support wrapper or direct regex
    try {
      const r = new RegExp(regex)
      const m = r.exec(text)
      if (m && m[1]) return m[1]
    } catch {
      // ignore
    }
    return undefined
  },

  parseMediaNumber(text: string, regex: string): number | undefined {
    try {
      const r = new RegExp(regex)
      const m = r.exec(text)
      if (m && m[1]) return Number.parseInt(m[1], 10)
    } catch {
      // ignore
    }
    return undefined
  },

  // === New Robust Extractors ===

  extractSeason(
    text: string,
    userRegex?: string | { value: string }[]
  ): RegexMatchResult | null {
    if (!text) return null

    // 1. User Regex
    if (userRegex) {
      const regexes = Array.isArray(userRegex)
        ? userRegex.map((r) => r.value)
        : typeof userRegex === 'string'
          ? [userRegex]
          : []
      for (const regex of regexes) {
        try {
          const r = new RegExp(regex)
          const m = r.exec(text)
          if (m && m[1]) return { value: m[1], raw: m[0] } // Approximate raw if user regex
        } catch {
          // ignore
        }
      }
    }

    // 2. Common Patterns (Strict)
    // Avoid "DNS1" matching "S1"
    const sPatterns = [
      // S1, Season 1
      /(?:^|\s|[\[(])S(\d+)(?:$|\s|[\])])/i,
      /(?:^|\s)Season\s*(\d+)(?:$|\s)/i,
      // Chinese
      /第\s*(\d+)\s*季/,
      /第\s*([零一二三四五六七八九十百]+)\s*季/,
    ]

    for (const pat of sPatterns) {
      const m = pat.exec(text)
      if (m) {
        const val = m[1]
        const raw = m[0].trim()

        // If chinese
        const cnVal = chineseToNumber(val)
        if (cnVal !== null) return { value: cnVal.toString(), raw }
        return { value: val, raw }
      }
    }

    return null
  },

  /**
   * Extracts an episode number from the given text using:
   * 1. User regex
   * 2. Common patterns
   */
  extractEpisodeNumber(
    text: string,
    userRegex?: string[]
  ): RegexMatchResult | null {
    if (!text) {
      return null
    }

    // 1. Prefer User Regex
    if (userRegex) {
      for (const regex of userRegex) {
        try {
          const res = regexMatchWithGroup(text, regex)

          if (res) {
            const [value, raw] = res
            const num = Number.parseInt(value, 10)
            if (!Number.isNaN(num)) {
              return { value: num, raw }
            }

            const cn = chineseToNumber(value)
            if (cn !== null) {
              return { value: cn, raw }
            }
            return null
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Common Patterns
    const patterns = [
      // S1E1 - match the E part specifically.
      // We look for E followed by digits
      /(?:^|\s|[\[(])E(\d+)(?:$|\s|[\])])/i,
      // "Episode 1"
      /(?:^|\s)Ep(?:isode)?\.?\s+(\d+)(?:$|\s)/i,
      // Chinese
      /第\s*(\d+)\s*[集话]/,
      /第\s*([零一二三四五六七八九十百]+)\s*[集话]/,
      // S_E_
      /S\d+E(\d+)/i,
    ]

    for (const pat of patterns) {
      const m = pat.exec(text)
      if (m) {
        const val = m[1]
        const raw = m[0].trim()

        const cnVal = chineseToNumber(val)
        if (cnVal !== null) {
          return { value: cnVal, raw }
        }
        return { value: Number.parseInt(val, 10), raw }
      }
    }

    return null
  },

  extractTitle(text: string, userRegex?: string[]): string | null {
    if (!text) return null

    // 1. User Regex
    if (userRegex) {
      for (const regex of userRegex) {
        try {
          const res = regexMatchWithGroup(text, regex)
          if (res) {
            const [value] = res
            return value.trim()
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Fallbacks
    return text.trim()
  },

  // Legacy Adapters to keep API close to what might be expected or to simplify migration
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

  parseMediaFromTitle(
    titleText: string,
    userRegex?: string[]
  ): { title: string; episode?: number } {
    const info = {
      title: titleText,
      episode: undefined as number | undefined,
    }
    let season = ''

    // 1. User Regex
    if (userRegex) {
      for (const r of userRegex) {
        try {
          const reg = new RegExp(r)
          const m = reg.exec(titleText)
          if (m) {
            // heuristic: if group 1 exists, use it as title
            if (m[1]) info.title = m[1]
            break
          }
        } catch {
          // ignore
        }
      }
    }

    // Robust Extraction
    const s = RegexUtils.extractSeason(titleText)
    if (s) {
      season = s.value as string
    }

    const e = RegexUtils.extractEpisodeNumber(titleText)
    if (e) {
      info.episode = e.value as number
    }

    if (season) {
      info.title = info.title + ' ' + season
    }

    return info
  },
}

// Export individual functions to match the imports in extractMediaInfo originally (if we want to preserve that style)
// But I will probably refactor `extractMediaInfo` to use `RegexUtils` object or the exports below.

export const parseMediaString = RegexUtils.parseMediaString
export const parseMediaNumber = RegexUtils.parseMediaNumber
export const parseMultipleRegex = RegexUtils.parseMultipleRegex

// Adapter for the complex one
export function parseMediaFromTitle(
  text: string,
  regex?: string | { value: string }[]
) {
  const info = RegexUtils.parseMediaFromTitle(text, regex)
  return info
}

/**
 * Sort selectors by quick flag, then by value.
 * Used in element matching.
 */
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
