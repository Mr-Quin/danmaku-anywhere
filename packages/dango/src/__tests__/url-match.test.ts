import { describe, expect, it } from 'vitest'
import {
  findManifestForUrl,
  findManifestMatchForUrl,
  matchUrl,
  urlMatches,
} from '../engine/url-match.js'
import { zManifest } from '../manifest/schema.js'

/**
 * Tests url-match.ts: urlMatches (boolean), matchUrl (named capture groups),
 * findManifestForUrl (first-match priority), and findManifestMatchForUrl
 * (manifest + groups together). Covers host wildcards, path regex,
 * malformed input tolerance, and empty-urlMatch handling.
 */

function manifestWith(
  id: string,
  urlMatch: Array<{ host: string; path: string }>
) {
  return zManifest.parse({
    apiVersion: 1,
    id,
    name: id,
    version: '0.1.0',
    hosts: ['api.example.com'],
    urlMatch,
  })
}

describe('urlMatches', () => {
  it('matches exact host + path regex', () => {
    expect(
      urlMatches('https://www.bilibili.com/bangumi/play/ss12345', {
        host: 'www.bilibili.com',
        path: '^/bangumi/play/',
      })
    ).toBe(true)
  })

  it('matches *.host wildcard', () => {
    expect(
      urlMatches('https://m.bilibili.com/video/BV1xx', {
        host: '*.bilibili.com',
        path: '^/video/',
      })
    ).toBe(true)
  })

  it('rejects mismatched host', () => {
    expect(
      urlMatches('https://www.youku.com/v_show/id_X', {
        host: 'www.bilibili.com',
        path: '.*',
      })
    ).toBe(false)
  })

  it('rejects mismatched path', () => {
    expect(
      urlMatches('https://www.bilibili.com/festival/foo', {
        host: 'www.bilibili.com',
        path: '^/bangumi/',
      })
    ).toBe(false)
  })

  it('handles malformed URLs gracefully', () => {
    expect(urlMatches('not a url', { host: '*.x', path: '.' })).toBe(false)
  })

  it('handles invalid regex patterns gracefully', () => {
    expect(urlMatches('https://x.com/y', { host: 'x.com', path: '(bad' })).toBe(
      false
    )
  })
})

describe('findManifestForUrl', () => {
  it('returns the first manifest whose urlMatch contains a hit', () => {
    const bili = manifestWith('bilibili', [
      { host: 'www.bilibili.com', path: '^/bangumi/play/' },
    ])
    const tencent = manifestWith('tencent', [
      { host: 'v.qq.com', path: '^/x/cover/' },
    ])
    const found = findManifestForUrl(
      [bili, tencent],
      'https://v.qq.com/x/cover/abc.html'
    )
    expect(found?.id).toBe('tencent')
  })

  it('returns null when nothing matches', () => {
    const m = manifestWith('only-bili', [
      { host: 'www.bilibili.com', path: '.*' },
    ])
    expect(
      findManifestForUrl([m], 'https://www.youtube.com/watch?v=x')
    ).toBeNull()
  })

  it('returns null for manifests with empty urlMatch', () => {
    const m = manifestWith('no-url-match', [])
    expect(
      findManifestForUrl([m], 'https://www.bilibili.com/anything')
    ).toBeNull()
  })
})

describe('matchUrl', () => {
  it('returns empty groups when the path has no named captures', () => {
    const r = matchUrl('https://www.bilibili.com/bangumi/play/ss12345', {
      host: 'www.bilibili.com',
      path: '^/bangumi/play/',
    })
    expect(r).toEqual({ groups: {} })
  })

  it('extracts named capture groups', () => {
    const r = matchUrl('https://www.bilibili.com/bangumi/play/ss12345', {
      host: 'www.bilibili.com',
      path: '^/bangumi/play/ss(?<ssid>\\d+)',
    })
    expect(r?.groups).toEqual({ ssid: '12345' })
  })

  it('extracts multiple named groups', () => {
    const r = matchUrl(
      'https://v.qq.com/x/cover/mzc00200ztsl4to/m4100bardal.html',
      {
        host: 'v.qq.com',
        path: '^/x/cover/(?<cid>[^/]+)/(?<vid>[^/]+)\\.html',
      }
    )
    expect(r?.groups).toEqual({
      cid: 'mzc00200ztsl4to',
      vid: 'm4100bardal',
    })
  })

  it('returns null when host does not match', () => {
    expect(
      matchUrl('https://example.com/x', { host: 'other.com', path: '.*' })
    ).toBeNull()
  })

  it('returns null when path does not match', () => {
    expect(
      matchUrl('https://www.bilibili.com/festival', {
        host: 'www.bilibili.com',
        path: '^/bangumi/',
      })
    ).toBeNull()
  })
})

describe('findManifestMatchForUrl', () => {
  it('returns the matched manifest plus named capture groups', () => {
    const bili = manifestWith('bilibili', [
      { host: 'www.bilibili.com', path: '^/bangumi/play/ss(?<ssid>\\d+)' },
      { host: 'www.bilibili.com', path: '^/bangumi/play/ep(?<epid>\\d+)' },
    ])
    const tencent = manifestWith('tencent', [
      {
        host: 'v.qq.com',
        path: '^/x/cover/(?<cid>[^/]+)/(?<vid>[^/]+)\\.html',
      },
    ])

    const ss = findManifestMatchForUrl(
      [bili, tencent],
      'https://www.bilibili.com/bangumi/play/ss12345'
    )
    expect(ss?.manifest.id).toBe('bilibili')
    expect(ss?.groups).toEqual({ ssid: '12345' })

    const ep = findManifestMatchForUrl(
      [bili, tencent],
      'https://www.bilibili.com/bangumi/play/ep67890'
    )
    expect(ep?.manifest.id).toBe('bilibili')
    expect(ep?.groups).toEqual({ epid: '67890' })

    const t = findManifestMatchForUrl(
      [bili, tencent],
      'https://v.qq.com/x/cover/abc/def.html'
    )
    expect(t?.manifest.id).toBe('tencent')
    expect(t?.groups).toEqual({ cid: 'abc', vid: 'def' })
  })

  it('returns null when no manifest matches', () => {
    const m = manifestWith('bilibili', [
      { host: 'www.bilibili.com', path: '.*' },
    ])
    expect(
      findManifestMatchForUrl([m], 'https://www.youtube.com/watch?v=x')
    ).toBeNull()
  })
})
