import type { BrowserContext, Route } from '@playwright/test'

export type AllowedNetworkPattern = string | RegExp

export interface NetworkWatcher {
  getEntries: () => string[]
}

const ALLOWED_SCHEMES = ['data:', 'blob:', 'about:'] as const

// The fake build is fully in-memory, so the only legitimate network is the
// same-origin webServer (localhost:4173) plus inline data/blob URLs. Any other
// origin means fake mode leaked to a real backend (api.bgm.tv, weeblify, ...),
// which is a bug, not an allow-list gap.
function isProjectAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (
      ALLOWED_SCHEMES.includes(
        parsed.protocol as (typeof ALLOWED_SCHEMES)[number]
      )
    ) {
      return true
    }
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function matchesAllowed(
  url: string,
  patterns: readonly AllowedNetworkPattern[]
): boolean {
  return patterns.some((pattern) => {
    return typeof pattern === 'string'
      ? url.includes(pattern)
      : pattern.test(url)
  })
}

// Register before any per-spec route. Playwright fires the newest handler
// first, so this catch-all only runs when nothing more specific matched.
export async function attachNetworkWatcher(
  context: BrowserContext,
  getAllowed: () => readonly AllowedNetworkPattern[]
): Promise<NetworkWatcher> {
  const entries: string[] = []

  await context.route('**/*', async (route: Route) => {
    const req = route.request()
    const url = req.url()
    if (isProjectAllowed(url) || matchesAllowed(url, getAllowed())) {
      await route.fallback()
      return
    }
    entries.push(`${req.method()} ${url}`)
    await route.abort('failed')
  })

  return { getEntries: () => [...entries] }
}
