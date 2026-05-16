import type {
  BrowserContext,
  ConsoleMessage,
  Page,
  Worker,
} from '@playwright/test'

export interface ConsoleWatcher {
  getErrors: () => string[]
}

export function attachConsoleWatcher(context: BrowserContext): ConsoleWatcher {
  const errors: string[] = []
  // Dedupe — the context.on listener and the initial enumeration can race.
  const watched = new WeakSet<Page | Worker>()

  function formatLocation(msg: ConsoleMessage): string {
    const loc = msg.location()
    if (!loc.url) {
      return ''
    }
    return ` (${loc.url}:${loc.lineNumber}:${loc.columnNumber})`
  }

  function watchWorker(worker: Worker): void {
    if (watched.has(worker)) {
      return
    }
    watched.add(worker)
    worker.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[sw] ${msg.text()}${formatLocation(msg)}`)
      }
    })
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

  // Context listeners FIRST so a mid-enumeration register is still captured.
  context.on('serviceworker', watchWorker)
  context.on('page', watchPage)

  for (const w of context.serviceWorkers()) {
    watchWorker(w)
  }
  for (const p of context.pages()) {
    watchPage(p)
  }

  return { getErrors: () => [...errors] }
}
