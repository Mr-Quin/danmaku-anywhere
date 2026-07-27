import type { Locator, Page } from '@playwright/test'

export class DanmakuViewerPage {
  constructor(private readonly page: Page) {}

  // The comments table is virtualized: only rows inside the scroll viewport
  // exist in the DOM, so this resolves nothing for a comment far down a long
  // list. Assert on the first handful of a small fixture.
  commentRow(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text })
  }
}
