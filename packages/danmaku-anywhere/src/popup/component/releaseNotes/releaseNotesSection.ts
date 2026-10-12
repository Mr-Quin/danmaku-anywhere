const CJK = /[㐀-鿿]/g

function cjkCount(text: string): number {
  return text.match(CJK)?.length ?? 0
}

// Bilingual release bodies hold a Chinese and an English section separated by
// a line of `---`. Shows the section for the UI language, or the whole body
// when it does not split into one section of each.
export function releaseNotesSection(body: string, language: string): string {
  const sections = body
    .split(/^\s*---\s*$/m)
    .map((section) => section.trim())
    .filter((section) => section !== '')
  if (sections.length !== 2) {
    return body
  }
  const [first, second] = sections
  const firstCjk = cjkCount(first)
  const secondCjk = cjkCount(second)
  if (firstCjk === secondCjk) {
    return body
  }
  const [zh, en] = firstCjk > secondCjk ? [first, second] : [second, first]
  return language.toLowerCase().startsWith('zh') ? zh : en
}
