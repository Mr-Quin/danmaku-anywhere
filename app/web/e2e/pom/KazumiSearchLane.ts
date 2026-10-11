import type { Locator, Page } from '@playwright/test'

// The kazumi search lane (data-kind="search"): keyword input, submit, and the
// result list whose items carry data-url.
export class KazumiSearchLane {
  readonly lane: Locator

  constructor(page: Page) {
    this.lane = page.locator('[data-testid="lane"][data-kind="search"]')
  }

  input(): Locator {
    return this.lane.locator('[data-testid="kazumi-search-input"]')
  }

  submit(): Locator {
    return this.lane.locator('[data-testid="kazumi-search-submit"]')
  }

  results(): Locator {
    return this.lane.locator('[data-testid="kazumi-result-item"]')
  }

  async search(keyword: string): Promise<void> {
    await this.input().fill(keyword)
    await this.submit().click()
  }
}
