const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g
export const PLACEHOLDER_RE = /\{episode(?::(\d+)d)?\}/g
const TRAILING_DIGIT_RE = /\d$/
const ALL_DIGITS_RE = /^\d+$/

function escapeRegExp(str: string): string {
  return str.replace(ESCAPE_RE, '\\$&')
}

/**
 * Build a regex from a pattern template that captures the episode number.
 * e.g. `S01E{episode:02d}.xml` → `/^S01E(\d{2})\.xml$/`
 */
export function buildPatternRegex(template: string): RegExp | null {
  PLACEHOLDER_RE.lastIndex = 0
  const parts: string[] = []
  let lastIndex = 0
  let hasPlaceholder = false

  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    hasPlaceholder = true
    parts.push(escapeRegExp(template.slice(lastIndex, match.index)))
    const padWidth = match[1]
    parts.push(padWidth ? `(\\d{${padWidth}})` : '(\\d+)')
    lastIndex = match.index + match[0].length
  }

  if (!hasPlaceholder) {
    return null
  }

  parts.push(escapeRegExp(template.slice(lastIndex)))
  return new RegExp(`^${parts.join('')}$`)
}

/**
 * Extract an episode number from a filename using a prebuilt regex.
 */
export function extractEpisodeFromRegex(
  regex: RegExp,
  fileName: string
): number | null {
  const match = fileName.match(regex)
  if (!match?.[1]) {
    return null
  }
  return Number.parseInt(match[1], 10)
}

/**
 * Extract an episode number from a filename using a pattern template.
 * Returns null if the template has no placeholder or the filename doesn't match.
 *
 * For batch operations, prefer buildPatternRegex + extractEpisodeFromRegex
 * to avoid recompiling the regex per file.
 */
export function extractEpisodeFromFilename(
  template: string,
  fileName: string
): number | null {
  const regex = buildPatternRegex(template)
  if (!regex) {
    return null
  }
  return extractEpisodeFromRegex(regex, fileName)
}

/**
 * Auto-detect a pattern template from filenames using longest common
 * prefix/suffix. Returns null if detection fails.
 */
export function detectPattern(fileNames: string[]): string | null {
  if (fileNames.length < 2) {
    return null
  }

  let prefix = fileNames[0]
  for (const name of fileNames) {
    while (!name.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
  }

  let suffix = fileNames[0]
  for (const name of fileNames) {
    while (!name.endsWith(suffix)) {
      suffix = suffix.slice(1)
    }
  }

  // Backtrack prefix past any trailing digits so zero-padding isn't split
  while (prefix.length > 0 && TRAILING_DIGIT_RE.test(prefix)) {
    prefix = prefix.slice(0, -1)
  }

  let minLen = fileNames[0].length
  for (const name of fileNames) {
    if (name.length < minLen) {
      minLen = name.length
    }
  }

  if (prefix.length + suffix.length >= minLen) {
    return null
  }

  const middles = fileNames.map((name) => {
    return name.slice(prefix.length, name.length - suffix.length)
  })

  if (!middles.every((m) => ALL_DIGITS_RE.test(m))) {
    return null
  }

  const allSameWidth = middles.every((m) => m.length === middles[0].length)
  const padWidth = allSameWidth && middles[0].length > 1 ? middles[0].length : 0
  const placeholder = padWidth > 0 ? `{episode:0${padWidth}d}` : '{episode}'

  return `${prefix}${placeholder}${suffix}`
}
