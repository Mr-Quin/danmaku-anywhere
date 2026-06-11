import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from './schema'
import { ProviderConfigService } from './service'

/**
 * Covers supportsAutomaticMode after the capability decouple: every
 * manifest-driven source qualifies for automatic mode, keyed off the
 * manifestId, and legacy MacCMS (no manifest) is the only opt-out.
 */

function makeService(): ProviderConfigService {
  const logger = { sub: () => logger, error: vi.fn() } as never
  const options = { version: () => options }
  const factory = (() => options) as never
  return new ProviderConfigService(logger, factory)
}

function makeConfig(manifestId: string): ProviderConfig {
  return {
    id: manifestId,
    manifestId,
    name: 'test',
    enabled: true,
    configValues: {},
  }
}

describe('supportsAutomaticMode', () => {
  const service = makeService()

  it.each([
    ['dandanplay'],
    ['bilibili'],
    ['tencent'],
  ])('returns true for manifest-driven source %s', (manifestId) => {
    const config = makeConfig(manifestId)
    expect(service.supportsAutomaticMode(config)).toBe(true)
  })

  it('returns true for a custom manifest-driven source', () => {
    const config = makeConfig('custom:something')
    expect(service.supportsAutomaticMode(config)).toBe(true)
  })

  it('returns false only for legacy MacCMS', () => {
    const config = makeConfig(LEGACY_MACCMS_ID)
    expect(service.supportsAutomaticMode(config)).toBe(false)
  })
})
