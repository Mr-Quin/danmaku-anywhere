// Per-source network mock builders. Each function returns a NetworkMock
// (pattern + handler) that gets installed via Playwright's context.route.
//
// URL patterns are centralized here so when an upstream URL changes
// (or is replaced by a manifest under DA-472) we touch one file.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Route } from '@playwright/test'
import type { NetworkMock } from './profile'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// e2e/setup/network.ts → e2e/fixtures/
const FIXTURES_ROOT = path.join(__dirname, '..', 'fixtures')

export function loadJsonFixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES_ROOT, name), 'utf-8')) as T
}

export function loadTextFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_ROOT, name), 'utf-8')
}

export function loadBinaryFixture(name: string): Buffer {
  return readFileSync(path.join(FIXTURES_ROOT, name))
}

// --- DDP -----------------------------------------------------------------
// All DDP requests go through the proxy:
//   https://api.danmaku.weeblify.app/ddp/v1?path=<url-encoded inner path>
// The inner path determines which fixture to serve.

export interface DdpFixtures {
  search: unknown
  bangumi: unknown
  comments: unknown
}

// Matches both prod (api.danmaku.weeblify.app) and staging
// (api.danmaku-staging.weeblify.app) — dev builds default to staging.
const DDP_PROXY_PATTERN = /api\.danmaku(-staging)?\.weeblify\.app\/ddp\/v1/

export function mockDandanplay(fixtures: DdpFixtures): NetworkMock {
  return {
    pattern: DDP_PROXY_PATTERN,
    respond: async (route: Route) => {
      const innerPath =
        new URL(route.request().url()).searchParams.get('path') ?? ''
      if (innerPath.startsWith('/v2/search/anime')) {
        await route.fulfill({ json: fixtures.search })
        return
      }
      if (innerPath.startsWith('/v2/bangumi/')) {
        await route.fulfill({ json: fixtures.bangumi })
        return
      }
      if (innerPath.startsWith('/v2/comment/')) {
        await route.fulfill({ json: fixtures.comments })
        return
      }
      await route.fulfill({
        status: 404,
        body: `unhandled DDP path: ${innerPath}`,
      })
    },
  }
}

// --- DDP-Compat ----------------------------------------------------------
// Custom DanDanPlay-compatible endpoint with arbitrary baseUrl.

export interface DdpCompatFixtures {
  baseUrl: string
  search: unknown
  bangumi: unknown
  comments: unknown
}

export function mockDandanplayCompat(
  fixtures: DdpCompatFixtures
): NetworkMock[] {
  const escaped = fixtures.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    {
      pattern: new RegExp(`${escaped}/v2/search/anime`),
      respond: (route) => route.fulfill({ json: fixtures.search }),
    },
    {
      pattern: new RegExp(`${escaped}/v2/bangumi/`),
      respond: (route) => route.fulfill({ json: fixtures.bangumi }),
    },
    {
      pattern: new RegExp(`${escaped}/v2/comment/`),
      respond: (route) => route.fulfill({ json: fixtures.comments }),
    },
  ]
}

// --- Bilibili ------------------------------------------------------------
// Search hits /x/web-interface/search/type with media_bangumi or media_ft.
// Episodes hit /pgc/view/web/season. Danmaku uses either /x/v1/dm/list.so
// (XML) or /x/v2/dm/web/seg.so (protobuf segments).

export interface BilibiliCommonFixtures {
  searchBangumi: unknown
  searchFt: unknown
  season: unknown
}

export interface BilibiliXmlFixtures extends BilibiliCommonFixtures {
  xml: string
}

export interface BilibiliProtoFixtures extends BilibiliCommonFixtures {
  // First segment is the real protobuf bytes; subsequent segments return 304
  // (which the manifest treats as "no more data").
  protoSegment1: Buffer
}

function makeBilibiliCommonRoutes(
  fixtures: BilibiliCommonFixtures
): NetworkMock[] {
  return [
    {
      pattern: /api\.bilibili\.com\/x\/web-interface\/search\/type/,
      respond: async (route) => {
        const url = new URL(route.request().url())
        const t = url.searchParams.get('search_type')
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
    ...makeBilibiliCommonRoutes(fixtures),
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
    ...makeBilibiliCommonRoutes(fixtures),
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
        // 304: no more segments. Manifest opts into acceptStatus: [304] and
        // decodes empty body as "no elems".
        return route.fulfill({ status: 304, body: '' })
      },
    },
  ]
}

// --- Tencent -------------------------------------------------------------

export interface TencentFixtures {
  search: unknown
  episodes: unknown
  danmakuBase: unknown
  // Keyed by segment_name.
  danmakuSegments: Record<string, unknown>
}

export function mockTencent(fixtures: TencentFixtures): NetworkMock[] {
  return [
    {
      pattern:
        /pbaccess\.video\.qq\.com\/trpc\.videosearch\.mobile_search\.MultiTerminalSearch\/MbSearch/,
      respond: (route) => route.fulfill({ json: fixtures.search }),
    },
    {
      pattern:
        /pbaccess\.video\.qq\.com\/trpc\.universal_backend_service\.page_server_rpc\.PageServer\/GetPageData/,
      respond: (route) => route.fulfill({ json: fixtures.episodes }),
    },
    {
      pattern: /dm\.video\.qq\.com\/barrage\/base\//,
      respond: (route) => route.fulfill({ json: fixtures.danmakuBase }),
    },
    {
      pattern: /dm\.video\.qq\.com\/barrage\/segment\//,
      respond: (route) => {
        const pathname = new URL(route.request().url()).pathname
        const segmentName = pathname.split('/').pop() ?? ''
        const body = fixtures.danmakuSegments[segmentName]
        if (body === undefined) {
          return route.fulfill({ status: 404, body: 'no segment' })
        }
        return route.fulfill({ json: body })
      },
    },
  ]
}
