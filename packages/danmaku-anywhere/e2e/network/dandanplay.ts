import type { Route } from '@playwright/test'
import type { NetworkMock } from '../setup/profile'

export interface DandanplayFixtures {
  search: unknown
  bangumi: unknown
  comments: unknown
}

const DDP_ROUTES = [
  { path: '/api/v2/search/anime', key: 'search' },
  { path: '/api/v2/bangumi/', key: 'bangumi' },
  { path: '/api/v2/comment/', key: 'comments' },
] as const

// Path-only match: VITE_PROXY_URL host varies between local, CI, and prod.
// The built-in provider points baseUrl at {proxy}/ddp and the manifest hits
// /api/v2/* on it, so the proxy passes the path through transparently.
const PROXY_PATH = /\/ddp\/api\/v2\//

export function mockDandanplay(fixtures: DandanplayFixtures): NetworkMock {
  return {
    pattern: PROXY_PATH,
    respond: async (route: Route) => {
      const innerPath = new URL(route.request().url()).pathname
      const matched = DDP_ROUTES.find((r) => innerPath.includes(r.path))
      if (!matched) {
        await route.fulfill({
          status: 404,
          body: `unhandled DDP path: ${innerPath}`,
        })
        return
      }
      await route.fulfill({ json: fixtures[matched.key] })
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
  return DDP_ROUTES.map((r) => ({
    pattern: new RegExp(`${escaped}${r.path}`),
    respond: (route) => route.fulfill({ json: fixtures[r.key] }),
  }))
}
