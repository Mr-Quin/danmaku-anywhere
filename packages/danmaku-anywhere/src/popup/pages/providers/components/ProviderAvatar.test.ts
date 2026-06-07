import { describe, expect, it } from 'vitest'
import { providerInitials } from './ProviderAvatar'

/**
 * The source avatar shows two letters for Latin names and a single glyph for
 * CJK names, so a Chinese source reads as 哔 rather than a placeholder.
 */

describe('providerInitials', () => {
  it('uppercases the first two latin letters', () => {
    expect(providerInitials('Bilibili')).toBe('BI')
    expect(providerInitials('iQIYI')).toBe('IQ')
    expect(providerInitials('Mango TV')).toBe('MA')
  })

  it('uses a single glyph for CJK names', () => {
    expect(providerInitials('哔哩哔哩')).toBe('哔')
    expect(providerInitials('腾讯视频')).toBe('腾')
    expect(providerInitials('ニコニコ')).toBe('ニ')
  })

  it('falls back for empty or symbol-only names', () => {
    expect(providerInitials('   ')).toBe('··')
    expect(providerInitials('★')).toBe('★')
  })
})
