import { describe, expect, it } from 'vitest'
import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  providerTypeFromManifestId,
} from './provider.js'

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
