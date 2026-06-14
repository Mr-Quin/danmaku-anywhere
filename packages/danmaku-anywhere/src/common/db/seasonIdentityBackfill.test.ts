import { describe, expect, it } from 'vitest'
import { resolveBuiltinSeasonIdentity } from './seasonIdentityBackfill'

describe('resolveBuiltinSeasonIdentity', () => {
  it('returns the bare id for each built-in source', () => {
    expect(resolveBuiltinSeasonIdentity('dandanplay')).toBe('dandanplay')
    expect(resolveBuiltinSeasonIdentity('bilibili')).toBe('bilibili')
    expect(resolveBuiltinSeasonIdentity('tencent')).toBe('tencent')
  })

  it('strips a builtin: prefix before matching', () => {
    expect(resolveBuiltinSeasonIdentity('builtin:dandanplay')).toBe(
      'dandanplay'
    )
  })

  it('returns undefined for a self-hosted custom config uuid', () => {
    expect(
      resolveBuiltinSeasonIdentity('d9d068cc-d7a5-4277-990b-73b28f7637f8')
    ).toBeUndefined()
  })

  it('returns undefined for legacy:maccms (not a built-in manifest)', () => {
    expect(resolveBuiltinSeasonIdentity('legacy:maccms')).toBeUndefined()
  })

  it('returns undefined for null, undefined, or empty input', () => {
    expect(resolveBuiltinSeasonIdentity(null)).toBeUndefined()
    expect(resolveBuiltinSeasonIdentity(undefined)).toBeUndefined()
    expect(resolveBuiltinSeasonIdentity('')).toBeUndefined()
  })
})
