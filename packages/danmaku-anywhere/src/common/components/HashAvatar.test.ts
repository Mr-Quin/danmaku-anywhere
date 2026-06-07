import { describe, expect, it } from 'vitest'
import { avatarInitials } from './HashAvatar'

/**
 * The hashed avatar shows two letters for Latin labels and a single glyph for
 * CJK labels, so a Chinese label reads as 哔 rather than a placeholder.
 */

describe('avatarInitials', () => {
  it('uppercases the first two latin letters', () => {
    expect(avatarInitials('Bilibili')).toBe('BI')
    expect(avatarInitials('iQIYI')).toBe('IQ')
    expect(avatarInitials('Mango TV')).toBe('MA')
  })

  it('uses a single glyph for CJK labels', () => {
    expect(avatarInitials('哔哩哔哩')).toBe('哔')
    expect(avatarInitials('腾讯视频')).toBe('腾')
    expect(avatarInitials('ニコニコ')).toBe('ニ')
  })

  it('falls back for empty or symbol-only labels', () => {
    expect(avatarInitials('   ')).toBe('··')
    expect(avatarInitials('★')).toBe('★')
  })
})
