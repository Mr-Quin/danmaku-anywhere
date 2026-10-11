import type { Locator, Page } from '@playwright/test'

// The subject details lane (data-kind="show"): the bangumi subject header and
// its tab strip (comments is the default tab).
export class DetailsLane {
  readonly lane: Locator

  constructor(page: Page) {
    this.lane = page.locator('[data-testid="lane"][data-kind="show"]')
  }

  title(): Locator {
    return this.lane.locator('h1').first()
  }

  tab(name: string): Locator {
    return this.lane.locator(`[data-testid="details-tab-${name}"]`)
  }

  async openTab(name: string): Promise<void> {
    await this.tab(name).click()
  }

  episodes(): Locator {
    return this.lane.locator('da-episodes-tab h4')
  }
}
