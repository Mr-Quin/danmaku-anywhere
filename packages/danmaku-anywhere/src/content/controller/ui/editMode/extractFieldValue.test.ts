import { describe, expect, it } from 'vitest'
import { applyRegex } from './extractFieldValue'

/**
 * Unit coverage for the Edit Mode regex extraction primitive used by both the
 * picked-row display and the Refine popper preview. Verifies passthrough
 * (no pattern), capture-group preference, full-match fallback, no-match flag,
 * and invalid-pattern resilience.
 */

describe('applyRegex', () => {
  it('returns raw unchanged when pattern is null', () => {
    expect(applyRegex('hello world', null)).toEqual({
      parsed: 'hello world',
      regexMissed: false,
    })
  })

  it('returns the first capture group when present', () => {
    expect(applyRegex("BanG Dream! It's MyGO!!!!! · TV", '(.+?) · TV')).toEqual(
      {
        parsed: "BanG Dream! It's MyGO!!!!!",
        regexMissed: false,
      }
    )
  })

  it('falls back to the whole match when no capture group is present', () => {
    expect(applyRegex('Episode 11 abc', 'Episode \\d+')).toEqual({
      parsed: 'Episode 11',
      regexMissed: false,
    })
  })

  it('flags a regex miss and returns raw when pattern does not match', () => {
    expect(applyRegex('Episode 11', 'NoSuchPattern')).toEqual({
      parsed: 'Episode 11',
      regexMissed: true,
    })
  })

  it('treats an invalid pattern as a miss and returns raw', () => {
    expect(applyRegex('abc', '[invalid')).toEqual({
      parsed: 'abc',
      regexMissed: true,
    })
  })
})
