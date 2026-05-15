import type { BrowserContext, Page, Worker } from '@playwright/test'

export interface ConsoleWatcher {
  getErrors: () => string[]
}

export function attachConsoleWatcher(context: BrowserContext): ConsoleWatcher {
  const errors: string[] = []

  function watchWorker(worker: Worker): void {
    worker.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[sw] ${msg.text()}`)
      }
    })
  }

  function watchPage(page: Page): void {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[page ${page.url()}] ${msg.text()}`)
      }
    })
    page.on('pageerror', (err) => {
      errors.push(`[page ${page.url()}] ${err.message}`)
    })
  }

  for (const w of context.serviceWorkers()) {
    watchWorker(w)
  }
  for (const p of context.pages()) {
    watchPage(p)
  }

  context.on('serviceworker', watchWorker)
  context.on('page', watchPage)

  return { getErrors: () => [...errors] }
}
