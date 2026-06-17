import { describe, expect, it } from 'vitest'
import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  providerTypeFromManifestId,
  resolveBuiltinManifestId,
} from './provider.js'

describe('resolveBuiltinManifestId', () => {
  it('returns the bare id for each built-in source', () => {
    expect(resolveBuiltinManifestId('dandanplay')).toBe('dandanplay')
    expect(resolveBuiltinManifestId('bilibili')).toBe('bilibili')
    expect(resolveBuiltinManifestId('tencent')).toBe('tencent')
  })

  it('strips a builtin: prefix before matching', () => {
    expect(resolveBuiltinManifestId('builtin:dandanplay')).toBe('dandanplay')
  })

  it('returns undefined for a self-hosted custom config uuid', () => {
    expect(
      resolveBuiltinManifestId('d9d068cc-d7a5-4277-990b-73b28f7637f8')
    ).toBeUndefined()
  })

  it('returns undefined for legacy:maccms (not a built-in manifest)', () => {
    expect(resolveBuiltinManifestId(LEGACY_MACCMS_ID)).toBeUndefined()
  })

  it('returns undefined for null, undefined, or empty input', () => {
    expect(resolveBuiltinManifestId(null)).toBeUndefined()
    expect(resolveBuiltinManifestId(undefined)).toBeUndefined()
    expect(resolveBuiltinManifestId('')).toBeUndefined()
  })
})

describe('providerTypeFromManifestId', () => {
  it('maps the fixed built-in ids 1:1', () => {
    expect(providerTypeFromManifestId('dandanplay')).toBe(
      DanmakuSourceType.DanDanPlay
    )
    expect(providerTypeFromManifestId('bilibili')).toBe(
      DanmakuSourceType.Bilibili
    )
    expect(providerTypeFromManifestId('tencent')).toBe(
      DanmakuSourceType.Tencent
    )
  })

  it('maps the legacy maccms id to MacCMS', () => {
    expect(providerTypeFromManifestId(LEGACY_MACCMS_ID)).toBe(
      DanmakuSourceType.MacCMS
    )
  })

  it('falls back to DanDanPlay for generic catalog manifests', () => {
    expect(providerTypeFromManifestId('iqiyi')).toBe(
      DanmakuSourceType.DanDanPlay
    )
    expect(providerTypeFromManifestId('')).toBe(DanmakuSourceType.DanDanPlay)
  })

  it('never returns the Custom tag for a generic manifest', () => {
    expect(providerTypeFromManifestId('sohu')).not.toBe(
      DanmakuSourceType.Custom
    )
  })
})
