import type { BrowserContext, Page, Worker } from '@playwright/test'

export interface ConsoleWatcher {
  getErrors: () => string[]
}

export function attachConsoleWatcher(context: BrowserContext): ConsoleWatcher {
  const errors: string[] = []
  // Dedupe so a worker/page that races between context.on(...) firing and
  // the initial enumeration below isn't double-watched.
  const watched = new WeakSet<Page | Worker>()

  function watchWorker(worker: Worker): void {
    if (watched.has(worker)) {
      return
    }
    watched.add(worker)
    worker.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[sw] ${msg.text()}`)
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
        errors.push(`[page ${page.url()}] ${msg.text()}`)
      }
    })
    page.on('pageerror', (err) => {
      errors.push(`[page ${page.url()}] ${err.stack ?? err.message}`)
    })
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
