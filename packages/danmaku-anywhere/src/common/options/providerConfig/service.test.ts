import {
  DanmakuSourceType,
  LEGACY_MACCMS_ID,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from './schema'
import { ProviderConfigService } from './service'

/**
 * Covers supportsAutomaticMode after the capability decouple: every
 * manifest-driven source qualifies for automatic mode regardless of impl,
 * and legacy MacCMS (no manifest) is the only opt-out.
 */

function makeService(): ProviderConfigService {
  const logger = { sub: () => logger, error: vi.fn() } as never
  const factory = (() => ({ version: () => ({}) })) as never
  return new ProviderConfigService(logger, factory)
}

function makeConfig(
  manifestId: string,
  impl: DanmakuSourceType
): ProviderConfig {
  return {
    id: manifestId,
    manifestId,
    impl,
    name: 'test',
    isBuiltIn: false,
    enabled: true,
    configValues: {},
  }
}

describe('supportsAutomaticMode', () => {
  const service = makeService()

  it.each([
    [DanmakuSourceType.DanDanPlay],
    [DanmakuSourceType.Bilibili],
    [DanmakuSourceType.Tencent],
  ])('returns true for manifest-driven source %s', (impl) => {
    const config = makeConfig(PROVIDER_TO_BUILTIN_ID[impl], impl)
    expect(service.supportsAutomaticMode(config)).toBe(true)
  })

  it('returns true for a custom manifest-driven source', () => {
    const config = makeConfig('custom:something', DanmakuSourceType.DanDanPlay)
    expect(service.supportsAutomaticMode(config)).toBe(true)
  })

  it('returns false only for legacy MacCMS', () => {
    const config = makeConfig(LEGACY_MACCMS_ID, DanmakuSourceType.MacCMS)
    expect(service.supportsAutomaticMode(config)).toBe(false)
  })
})
