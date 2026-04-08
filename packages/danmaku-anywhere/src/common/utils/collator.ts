/**
 * Shared Intl.Collator for CJK-aware string comparison.
 *
 * Uses a multi-locale fallback chain (zh, ja, ko) so that Chinese,
 * Japanese, and Korean characters are sorted by their natural reading
 * order (e.g. pinyin for Chinese) instead of raw Unicode codepoint.
 */
const collator = new Intl.Collator(['zh', 'ja', 'ko'], {
  numeric: true,
  sensitivity: 'base',
})

export function compareLocale(a: string, b: string): number {
  return collator.compare(a, b)
}
