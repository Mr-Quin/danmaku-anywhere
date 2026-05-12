import { describe, expect, it } from 'vitest'
import { findManifestForUrl, urlMatches } from '../engine/url-match.js'
import { zManifest } from '../manifest/schema.js'

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
