import type { BrowserContext, Route } from '@playwright/test'

export type AllowedNetworkPattern = string | RegExp

export interface NetworkWatcher {
  getEntries: () => string[]
}

// Schemes / hosts the e2e harness always allows without spec opt-in:
// - chrome-extension:// — extension's own pages and bundled assets
// - data:/blob:/about: — inert schemes that don't reach a remote
// - *.invalid hosts — project convention for fixture data (image URLs,
//   integration-page origins). RFC 6761 reserves `.invalid`; DNS fails by
//   design, so allowing them through doesn't leak.
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

// Install a deny-all fallback that records and aborts any request not
// covered by an explicit per-spec mock or the project/spec allowlist. The
// fallback is registered early (during context fixture setup) so per-spec
// `context.route()` calls registered later in applyProfile() are newer in
// Playwright's handler chain and intercept matching URLs first; this
// handler only fires when no specific route claimed the request.
export async function attachNetworkWatcher(
  context: BrowserContext,
  getAllowed: () => readonly AllowedNetworkPattern[]
): Promise<NetworkWatcher> {
  const entries: string[] = []

  await context.route('**/*', async (route: Route) => {
    const req = route.request()
    const url = req.url()
    if (isProjectAllowed(url) || matchesAllowed(url, getAllowed())) {
      // Pass through to per-spec mocks (older registrations in the chain)
      // or, failing that, the live network. For project-allowed URLs the
      // "live network" is either inert (chrome-extension://, data:, blob:)
      // or a guaranteed DNS failure (*.invalid) — neither leaks meaningfully.
      await route.fallback()
      return
    }
    entries.push(`${req.method()} ${url}`)
    await route.abort('failed')
  })

  return { getEntries: () => [...entries] }
}
