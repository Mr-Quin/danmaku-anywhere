import { md5 } from 'js-md5'
import { describe, expect, it } from 'vitest'
import { runPipeline } from '../engine/runner.js'
import { zManifest } from '../manifest/schema.js'
import { mockFetcher } from './fixtures.js'
import iqiyiManifest from './manifests/iqiyi.json' with { type: 'json' }

const iqiyiResponse = {
  data: {
    templates: [
      {
        template: 101,
        albumInfo: {
          qipuId: 555,
          title: 'Frieren',
          year: 2023,
        },
      },
    ],
  },
}

// Expected canonical-form string for signing — confirms the engine matches
// the imperative implementation in danmu_api's iqiyi.js _createSign().
function expectedSign(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
  const canonical = sorted.map((k) => `${k}=${params[k]}`).join('&')
  return md5(`${canonical}&secret_key=howcuteitis`).toUpperCase()
}

describe('iqiyi-style manifest (md5 sign)', () => {
  it('parses against zManifest', () => {
    expect(() => zManifest.parse(iqiyiManifest)).not.toThrow()
  })

  it('signs the search request the same way iqiyi.js does', async () => {
    const manifest = zManifest.parse(iqiyiManifest)
    const { fetcher, calls } = mockFetcher({
      'https://mesh.if.iqiyi.com/portal/lw/search/homePageV3': {
        body: JSON.stringify(iqiyiResponse),
      },
    })
    await runPipeline(manifest, manifest.search!, { q: 'frieren' }, { fetcher })

    expect(calls).toHaveLength(1)
    const url = new URL(calls[0].url)
    const expectedSig = expectedSign({
      key: 'frieren',
      pageNum: '1',
      pageSize: '25',
      mode: '1',
    })
    expect(url.searchParams.get('sign')).toBe(expectedSig)
    expect(url.searchParams.get('key')).toBe('frieren')
    expect(url.searchParams.get('mode')).toBe('1')
  })
})
