/**
 * Shared Intl.Collator for locale-aware string comparison.
 *
 * The locale list is a preference list for locale resolution — Intl.Collator
 * selects a single supported locale for all comparisons. Explicitly requesting
 * pinyin collation (zh-Hans-u-co-pinyin) ensures CJK titles sort by reading
 * order instead of raw Unicode codepoint, regardless of runtime ICU data.
 *
 * sensitivity: 'base' groups case/accent variants together (e.g. "A" == "a")
 * which gives stable, predictable ordering for mixed CJK/Latin title lists.
 */
const collator = new Intl.Collator(
  ['zh-Hans-u-co-pinyin', 'zh-u-co-pinyin', 'zh', 'ja', 'ko'],
  {
    numeric: true,
    sensitivity: 'base',
  }
)

export function compareLocale(a: string, b: string): number {
  return collator.compare(a, b)
}
