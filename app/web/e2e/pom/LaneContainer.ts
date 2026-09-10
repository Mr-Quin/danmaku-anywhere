import type { Locator, Page } from '@playwright/test'

// The horizontal lane strip. Every rendered column is a
// [data-testid="lane"][data-kind=...][data-column-id=...][data-active=...].
export class LaneContainer {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.locator('[data-testid="lane-container"]')
  }

  all(): Locator {
    return this.page.locator('[data-testid="lane"]')
  }

  byKind(kind: string): Locator {
    return this.page.locator(`[data-testid="lane"][data-kind="${kind}"]`)
  }

  active(): Locator {
    return this.page.locator('[data-testid="lane"][data-active="true"]')
  }

  async count(): Promise<number> {
    return this.all().count()
  }
}
