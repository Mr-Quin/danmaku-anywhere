import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { RpcException } from '@/common/rpc/types'
import { deserializeError, serializeError } from '@/common/utils/serializeError'
import { findSourceName, isUnreachableError } from './sourceError'

/**
 * isUnreachableError tells HTTP and network failures apart from other errors,
 * including when they arrive wrapped by the RPC layer. findSourceName names the
 * source a failed request went to: the episode's own config, or the first
 * enabled automatic source when matching.
 */

function overRpc(error: Error): RpcException {
  return new RpcException(error.message, {
    cause: deserializeError(serializeError(error)),
  })
}

function config(
  id: string,
  name: string,
  overrides: Partial<ProviderConfig> = {}
): ProviderConfig {
  return {
    id,
    manifestId: 'dandanplay',
    name,
    enabled: true,
    configValues: {},
    ...overrides,
  } as ProviderConfig
}

describe('isUnreachableError', () => {
  it('matches an HTTP status failure from a manifest source', () => {
    expect(
      isUnreachableError(
        overRpc(new Error('HTTP 500 for https://proxy.example/search?k=a'))
      )
    ).toBe(true)
  })

  it('matches a network failure', () => {
    expect(isUnreachableError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('matches a provider HttpException by name through the cause chain', () => {
    const inner = new Error('upstream said no')
    inner.name = 'HttpException'
    const outer = new RpcException('Search failed', { cause: inner })
    expect(isUnreachableError(outer)).toBe(true)
  })

  it('does not match other failures', () => {
    expect(isUnreachableError(new Error('No danmaku found for Frieren'))).toBe(
      false
    )
    expect(isUnreachableError('HTTP 500')).toBe(false)
    expect(isUnreachableError(undefined)).toBe(false)
  })
})

describe('findSourceName', () => {
  const configs = [
    config('maccms', 'MacCMS', { manifestId: LEGACY_MACCMS_ID }),
    config('off', 'Disabled', { enabled: false }),
    config('dandanplay', 'DanDanPlay'),
    config('bilibili', 'Bilibili'),
  ]

  it('names the config the episode came from', () => {
    expect(findSourceName(configs, 'bilibili')).toBe('Bilibili')
  })

  it('names the first enabled automatic source when no config is given', () => {
    expect(findSourceName(configs)).toBe('DanDanPlay')
  })

  it('returns undefined for an unknown config', () => {
    expect(findSourceName(configs, 'gone')).toBeUndefined()
  })
})
