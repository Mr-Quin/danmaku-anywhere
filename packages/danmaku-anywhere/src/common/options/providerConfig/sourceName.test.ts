import { describe, expect, it } from 'vitest'
import type { ProviderConfig } from './schema'
import { defaultSourceName, sourceDisplayNames, sourceName } from './sourceName'

/**
 * The source name selector: a custom name wins, otherwise the manifest's name
 * in the shown language, and the manifest id when the manifest is unknown.
 * Configs that end up with the same name are told apart by their server; the
 * built-in keeps its bare name.
 */

const enNames = new Map([
  ['dandanplay', 'DanDanPlay'],
  ['bilibili', 'Bilibili'],
])

const zhNames = new Map([
  ['dandanplay', '弹弹play'],
  ['bilibili', 'B站'],
])

function config(
  id: string,
  customName: string | null,
  baseUrl?: string
): ProviderConfig {
  return {
    id,
    manifestId: 'dandanplay',
    customName,
    enabled: true,
    configValues: baseUrl === undefined ? {} : { baseUrl },
  }
}

describe('sourceName', () => {
  it('follows the language of the manifest names for a default name', () => {
    const builtin = config('dandanplay', null)

    expect(sourceName(builtin, enNames)).toBe('DanDanPlay')
    expect(sourceName(builtin, zhNames)).toBe('弹弹play')
  })

  it('keeps a custom name in every language, even one equal to a default', () => {
    const named = config('dandanplay', 'DanDanPlay')

    expect(sourceName(named, zhNames)).toBe('DanDanPlay')
  })

  it('falls back to the manifest id when the manifest is unknown', () => {
    expect(defaultSourceName({ manifestId: 'mine:one' }, enNames)).toBe(
      'mine:one'
    )
  })
})

describe('sourceDisplayNames', () => {
  it('keeps unique names as they are', () => {
    const names = sourceDisplayNames(
      [
        config('dandanplay', null, 'https://proxy.example/ddp'),
        config('home', 'Home NAS', 'https://nas.example'),
      ],
      enNames
    )

    expect(names.get('dandanplay')).toBe('DanDanPlay')
    expect(names.get('home')).toBe('Home NAS')
  })

  it('adds the server to an instance on the default name next to the built-in', () => {
    const names = sourceDisplayNames(
      [
        config('dandanplay', null, 'https://proxy.example/ddp'),
        config('home', null, 'https://nas.example:8443/api'),
      ],
      zhNames
    )

    expect(names.get('dandanplay')).toBe('弹弹play')
    expect(names.get('home')).toBe('弹弹play (nas.example:8443/api)')
  })

  it('tells apart a custom name that matches the default name', () => {
    const names = sourceDisplayNames(
      [
        config('dandanplay', null, 'https://proxy.example/ddp'),
        config('home', 'DanDanPlay', 'https://nas.example'),
      ],
      enNames
    )

    expect(names.get('home')).toBe('DanDanPlay (nas.example)')
  })

  it('tells apart two instances on one host by their path', () => {
    const names = sourceDisplayNames(
      [
        config('a', 'Mine', 'https://nas.example/one/'),
        config('b', 'Mine', 'https://nas.example/two'),
      ],
      enNames
    )

    expect(names.get('a')).toBe('Mine (nas.example/one)')
    expect(names.get('b')).toBe('Mine (nas.example/two)')
  })

  it('keeps the bare name when the base URL cannot be parsed', () => {
    const names = sourceDisplayNames(
      [config('dandanplay', null), config('home', null, 'not a url')],
      enNames
    )

    expect(names.get('home')).toBe('DanDanPlay')
  })
})
