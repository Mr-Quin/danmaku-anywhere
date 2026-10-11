import { describe, expect, it } from 'vitest'
import { isBuiltinConfig, providerDisplayNames } from './displayName'
import type { ProviderConfig } from './schema'

/**
 * providerDisplayNames: unique names pass through, while configs that share a
 * name are told apart by their server host. The built-in keeps its bare name.
 */

function config(id: string, name: string, baseUrl?: string): ProviderConfig {
  return {
    id,
    manifestId: 'dandanplay',
    name,
    enabled: true,
    configValues: baseUrl === undefined ? {} : { baseUrl },
  }
}

describe('providerDisplayNames', () => {
  it('keeps unique names as they are', () => {
    const names = providerDisplayNames([
      config('dandanplay', 'DanDanPlay', 'https://proxy.example/ddp'),
      config('home', 'Home NAS', 'https://nas.example'),
    ])

    expect(names.get('dandanplay')).toBe('DanDanPlay')
    expect(names.get('home')).toBe('Home NAS')
  })

  it('adds the host to a self-hosted instance that shares the built-in name', () => {
    const names = providerDisplayNames([
      config('dandanplay', 'DanDanPlay', 'https://proxy.example/ddp'),
      config('home', 'DanDanPlay', 'https://nas.example:8443/api'),
    ])

    expect(names.get('dandanplay')).toBe('DanDanPlay')
    expect(names.get('home')).toBe('DanDanPlay (nas.example:8443/api)')
  })

  it('adds the host to every self-hosted instance in a shared name', () => {
    const names = providerDisplayNames([
      config('a', 'DanDanPlay', 'https://a.example'),
      config('b', 'DanDanPlay', 'https://b.example'),
    ])

    expect(names.get('a')).toBe('DanDanPlay (a.example)')
    expect(names.get('b')).toBe('DanDanPlay (b.example)')
  })

  it('tells apart two instances on one host by their path', () => {
    const names = providerDisplayNames([
      config('a', 'DanDanPlay', 'https://nas.example/one/'),
      config('b', 'DanDanPlay', 'https://nas.example/two'),
    ])

    expect(names.get('a')).toBe('DanDanPlay (nas.example/one)')
    expect(names.get('b')).toBe('DanDanPlay (nas.example/two)')
  })

  it('keeps the bare name when the base URL cannot be parsed', () => {
    const names = providerDisplayNames([
      config('dandanplay', 'DanDanPlay'),
      config('home', 'DanDanPlay', 'not a url'),
    ])

    expect(names.get('home')).toBe('DanDanPlay')
  })
})

describe('isBuiltinConfig', () => {
  it('is true only for the config whose id is its manifest id', () => {
    expect(isBuiltinConfig(config('dandanplay', 'DanDanPlay'))).toBe(true)
    expect(
      isBuiltinConfig(
        config('mirror', 'My DDP Mirror', 'https://api.danmaku.test/ddp')
      )
    ).toBe(false)
  })
})
