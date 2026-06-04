import type { Route } from '@playwright/test'
import type { NetworkMock } from '../setup/profile'

export interface DandanplayFixtures {
  search: unknown
  bangumi: unknown
  comments: unknown
}

// Path-only match — VITE_PROXY_URL host varies between local, CI, and prod.
// The built-in provider points baseUrl at {proxy}/ddp and the manifest hits
// /api/v2/* on it, so the proxy passes the path through transparently.
const PROXY_PATH = /\/ddp\/api\/v2\//

export function mockDandanplay(fixtures: DandanplayFixtures): NetworkMock {
  return {
    pattern: PROXY_PATH,
    respond: async (route: Route) => {
      const innerPath = new URL(route.request().url()).pathname
      if (innerPath.includes('/api/v2/search/anime')) {
        await route.fulfill({ json: fixtures.search })
        return
      }
      if (innerPath.includes('/api/v2/bangumi/')) {
        await route.fulfill({ json: fixtures.bangumi })
        return
      }
      if (innerPath.includes('/api/v2/comment/')) {
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

export interface DandanplayCustomFixtures {
  baseUrl: string
  search: unknown
  bangumi: unknown
  comments: unknown
}

export function mockDandanplayCustom(
  fixtures: DandanplayCustomFixtures
): NetworkMock[] {
  const escaped = fixtures.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [
    {
      pattern: new RegExp(`${escaped}/api/v2/search/anime`),
      respond: (route) => route.fulfill({ json: fixtures.search }),
    },
    {
      pattern: new RegExp(`${escaped}/api/v2/bangumi/`),
      respond: (route) => route.fulfill({ json: fixtures.bangumi }),
    },
    {
      pattern: new RegExp(`${escaped}/api/v2/comment/`),
      respond: (route) => route.fulfill({ json: fixtures.comments }),
    },
  ]
}
