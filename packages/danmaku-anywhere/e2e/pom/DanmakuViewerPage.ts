import type { Locator, Page } from '@playwright/test'

export class DanmakuViewerPage {
  constructor(private readonly page: Page) {}

  // Body rows only: the sortable header is also a role=row, so counting every
  // row would report one comment more than the table holds. The table is also
  // virtualized, so only rows inside the scroll viewport exist in the DOM.
  // Assert against small fixtures.
  commentRows(): Locator {
    return this.page.locator('tbody tr')
  }

  commentRow(text: string): Locator {
    return this.commentRows().filter({ hasText: text })
  }
}
