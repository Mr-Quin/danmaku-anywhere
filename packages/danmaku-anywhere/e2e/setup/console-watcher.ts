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
  // Dedupe so a worker/page that races between context.on(...) firing and
  // the initial enumeration below isn't double-watched.
  const watched = new WeakSet<Page | Worker>()

  function formatLocation(msg: ConsoleMessage): string {
    const loc = msg.location()
    if (!loc.url) {
      return ''
    }
    return ` (${loc.url}:${loc.lineNumber}:${loc.columnNumber})`
  }

  function watchWorker(worker: Worker, label = 'sw'): void {
    if (watched.has(worker)) {
      return
    }
    watched.add(worker)
    worker.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[${label}] ${msg.text()}${formatLocation(msg)}`)
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
    // Web Workers spawned by the page (distinct from extension SWs).
    page.on('worker', (w) => watchWorker(w, 'page-worker'))
    for (const w of page.workers()) {
      watchWorker(w, 'page-worker')
    }
  }

  // Attach context-level listeners FIRST so any worker/page that registers
  // mid-enumeration is still captured, then walk the current lists.
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
