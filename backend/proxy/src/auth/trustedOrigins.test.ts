import { describe, expect, it } from 'vitest'
import { parseTrustedOrigins } from '@/auth/trustedOrigins'

describe('parseTrustedOrigins', () => {
  it('splits a comma-separated value into one entry per origin', () => {
    expect(parseTrustedOrigins('https://a.example,https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('trims whitespace around entries', () => {
    expect(
      parseTrustedOrigins(' https://a.example , https://b.example ')
    ).toEqual(['https://a.example', 'https://b.example'])
  })

  it('drops empty segments', () => {
    expect(
      parseTrustedOrigins('https://a.example,,https://b.example,')
    ).toEqual(['https://a.example', 'https://b.example'])
  })

  it('returns a single-entry array for a value with no commas', () => {
    expect(parseTrustedOrigins('https://a.example')).toEqual([
      'https://a.example',
    ])
  })

  it('returns an empty array for an empty value', () => {
    expect(parseTrustedOrigins('')).toEqual([])
  })
})
