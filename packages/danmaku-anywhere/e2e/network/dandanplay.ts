import type { Route } from '@playwright/test'
import type { NetworkMock } from '../setup/profile'

export interface DandanplayFixtures {
  search: unknown
  bangumi: unknown
  comments: unknown
}

// Path-only match — VITE_PROXY_URL varies (prod, staging, the synthetic CI
// host). Tests intercept every request, so a stray match is moot.
const PROXY_PATH = /\/ddp\/v1(\?|$)/

export function mockDandanplay(fixtures: DandanplayFixtures): NetworkMock {
  return {
    pattern: PROXY_PATH,
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

export interface DandanplayCompatFixtures {
  baseUrl: string
  search: unknown
  bangumi: unknown
  comments: unknown
}

export function mockDandanplayCompat(
  fixtures: DandanplayCompatFixtures
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
