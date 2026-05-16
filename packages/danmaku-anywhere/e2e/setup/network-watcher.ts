import type { BrowserContext, Route } from '@playwright/test'

export type AllowedNetworkPattern = string | RegExp

export interface NetworkWatcher {
  getEntries: () => string[]
}

const PROJECT_ALLOWED_SCHEMES = [
  'chrome-extension:',
  'data:',
  'blob:',
  'about:',
] as const

function isProjectAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (
      PROJECT_ALLOWED_SCHEMES.includes(
        parsed.protocol as (typeof PROJECT_ALLOWED_SCHEMES)[number]
      )
    ) {
      return true
    }
    // `.invalid` (RFC 6761) — project-wide fixture convention.
    const host = parsed.hostname
    return host === 'invalid' || host.endsWith('.invalid')
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

// Register before per-spec routes — Playwright fires newest handler first,
// so this catch-all only runs when nothing specific matched.
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
