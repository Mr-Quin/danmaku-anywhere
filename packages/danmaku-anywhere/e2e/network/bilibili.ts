import type { NetworkMock } from '../setup/profile'

export interface BilibiliCommonFixtures {
  searchBangumi: unknown
  searchFt: unknown
  season: unknown
}

export interface BilibiliXmlFixtures extends BilibiliCommonFixtures {
  xml: string
}

export interface BilibiliProtoFixtures extends BilibiliCommonFixtures {
  // First segment carries the real protobuf bytes; later segments return 304
  // (the manifest treats it as "no more data").
  protoSegment1: Buffer
}

function commonRoutes(fixtures: BilibiliCommonFixtures): NetworkMock[] {
  return [
    {
      pattern: /api\.bilibili\.com\/x\/web-interface\/search\/type/,
      respond: async (route) => {
        const t = new URL(route.request().url()).searchParams.get('search_type')
        await route.fulfill({
          json:
            t === 'media_bangumi' ? fixtures.searchBangumi : fixtures.searchFt,
        })
      },
    },
    {
      pattern: /api\.bilibili\.com\/pgc\/view\/web\/season/,
      respond: (route) => route.fulfill({ json: fixtures.season }),
    },
  ]
}

export function mockBilibiliXml(fixtures: BilibiliXmlFixtures): NetworkMock[] {
  return [
    ...commonRoutes(fixtures),
    {
      pattern: /api\.bilibili\.com\/x\/v1\/dm\/list\.so/,
      respond: (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/xml',
          body: fixtures.xml,
        }),
    },
  ]
}

export function mockBilibiliProto(
  fixtures: BilibiliProtoFixtures
): NetworkMock[] {
  return [
    ...commonRoutes(fixtures),
    {
      pattern: /api\.bilibili\.com\/x\/v2\/dm\/web\/seg\.so/,
      respond: (route) => {
        const idx = new URL(route.request().url()).searchParams.get(
          'segment_index'
        )
        if (idx === '1') {
          return route.fulfill({
            status: 200,
            contentType: 'application/octet-stream',
            body: fixtures.protoSegment1,
          })
        }
        return route.fulfill({ status: 304, body: '' })
      },
    },
  ]
}
