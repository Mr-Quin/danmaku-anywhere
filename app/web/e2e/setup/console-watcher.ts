import type { BrowserContext, ConsoleMessage, Page } from '@playwright/test'

export interface ConsoleWatcher {
  getErrors: () => string[]
}

// Collects console.error and uncaught page errors across every page in the
// context. Ported from the extension e2e harness, minus the service-worker
// branch (the web app has no extension worker).
export function attachConsoleWatcher(context: BrowserContext): ConsoleWatcher {
  const errors: string[] = []
  const watched = new WeakSet<Page>()

  function formatLocation(msg: ConsoleMessage): string {
    const loc = msg.location()
    if (!loc.url) {
      return ''
    }
    return ` (${loc.url}:${loc.lineNumber}:${loc.columnNumber})`
  }

  function watchPage(page: Page): void {
    if (watched.has(page)) {
      return
    }
    watched.add(page)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[page ${page.url()}] ${msg.text()}${formatLocation(msg)}`)
      }
    })
    page.on('pageerror', (err) => {
      errors.push(`[page ${page.url()}] ${err.stack ?? err.message}`)
    })
  }

  context.on('page', watchPage)
  for (const p of context.pages()) {
    watchPage(p)
  }

  return { getErrors: () => [...errors] }
}
