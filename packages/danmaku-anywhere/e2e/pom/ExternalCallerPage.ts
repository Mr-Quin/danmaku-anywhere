import type { BrowserContext, Page } from '@playwright/test'

const PAGE_BODY = `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>DA external caller</title></head>
  <body><p>External caller harness</p></body>
</html>`

export interface ExternalRpcOutcome {
  // false when the browser refused the call outright, which is what a page on a
  // non-connectable origin gets.
  reached: boolean
  state?: string
  error?: string
  output?: unknown
}

// A website driving the extension the way a real one does, through
// chrome.runtime.sendMessage(extensionId, ...). The browser only exposes that
// API to origins listed in the manifest's externally_connectable, so calls from
// this page exercise the real boundary rather than a stubbed one.
export class ExternalCallerPage {
  private constructor(
    private readonly page: Page,
    private readonly extensionId: string
  ) {}

  static async open(
    context: BrowserContext,
    extensionId: string,
    url: string
  ): Promise<ExternalCallerPage> {
    const page = await context.newPage()
    await page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: PAGE_BODY,
      })
    })
    await page.goto(url)
    return new ExternalCallerPage(page, extensionId)
  }

  async call(method: string, input?: unknown): Promise<ExternalRpcOutcome> {
    return this.page.evaluate(
      async ({ extensionId, method, input }) => {
        try {
          const response = await chrome.runtime.sendMessage(extensionId, {
            method,
            input,
          })
          return { reached: true, ...response }
        } catch (e) {
          return { reached: false, error: e instanceof Error ? e.message : '' }
        }
      },
      { extensionId: this.extensionId, method, input }
    )
  }
}
