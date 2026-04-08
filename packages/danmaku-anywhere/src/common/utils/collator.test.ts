import { describe, expect, it } from 'vitest'
import { compareLocale } from './collator'

describe('compareLocale', () => {
  it('sorts Chinese characters by pinyin order', () => {
    // 北(běi) < 东(dōng) < 南(nán) in pinyin
    const sorted = ['南', '北', '东'].sort(compareLocale)
    expect(sorted).toEqual(['北', '东', '南'])
  })

  it('sorts numerically within strings', () => {
    const sorted = ['Episode 10', 'Episode 2', 'Episode 1'].sort(compareLocale)
    expect(sorted).toEqual(['Episode 1', 'Episode 2', 'Episode 10'])
  })

  it('is case-insensitive', () => {
    expect(compareLocale('Naruto', 'naruto')).toBe(0)
  })

  it('sorts mixed CJK and Latin strings consistently', () => {
    const items = ['Naruto', '北斗神拳', 'Attack on Titan', '东京喰种']
    const sorted = items.sort(compareLocale)
    // CJK characters sort before Latin in zh collation
    expect(sorted).toEqual([
      '北斗神拳',
      '东京喰种',
      'Attack on Titan',
      'Naruto',
    ])
  })
})
