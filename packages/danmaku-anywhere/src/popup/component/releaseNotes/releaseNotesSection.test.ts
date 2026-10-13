import { describe, expect, it } from 'vitest'
import { releaseNotesSection } from './releaseNotesSection'

/**
 * Picks the release notes section for the UI language from a bilingual body
 * (Chinese and English separated by a `---` line), in either order, and
 * falls back to the whole body when it is not split into one section of each.
 */

const zh = '## 特性\n\n- 弹幕源全面改版'
const en = '## Features\n\n- Danmaku sources were rebuilt'

describe('releaseNotesSection', () => {
  it('shows the Chinese section for a Chinese UI', () => {
    expect(releaseNotesSection(`${zh}\n\n---\n\n${en}`, 'zh')).toBe(zh)
  })

  it('shows the English section for any other UI language', () => {
    expect(releaseNotesSection(`${zh}\n\n---\n\n${en}`, 'en')).toBe(en)
    expect(releaseNotesSection(`${zh}\n\n---\n\n${en}`, 'en-US')).toBe(en)
  })

  it('handles the English section coming first', () => {
    expect(releaseNotesSection(`${en}\n---\n${zh}`, 'zh-CN')).toBe(zh)
    expect(releaseNotesSection(`${en}\n---\n${zh}`, 'en')).toBe(en)
  })

  it('shows the whole body when there is no separator', () => {
    expect(releaseNotesSection(en, 'zh')).toBe(en)
  })

  it('shows the whole body when both sections are in one language', () => {
    const body = `${en}\n\n---\n\n## Fixes\n\n- More fixes`
    expect(releaseNotesSection(body, 'zh')).toBe(body)
  })

  it('shows the whole body when it has more than two sections', () => {
    const body = `${zh}\n---\n${en}\n---\n${en}`
    expect(releaseNotesSection(body, 'en')).toBe(body)
  })

  it('does not split on a longer rule or a dash inside a line', () => {
    const body = `${zh}\n\n-----\n\n${en} --- more`
    expect(releaseNotesSection(body, 'en')).toBe(body)
  })
})
