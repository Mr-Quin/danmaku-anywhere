import type { Locator, Page } from '@playwright/test'

// The trending lane (data-kind="trending") and its show cards.
export class TrendingLane {
  readonly lane: Locator

  constructor(page: Page) {
    this.lane = page.locator('[data-testid="lane"][data-kind="trending"]')
  }

  cards(): Locator {
    return this.lane.locator('[data-testid="show-card"]')
  }

  firstCard(): Locator {
    return this.cards().first()
  }

  cardBySubjectId(id: number): Locator {
    return this.lane.locator(
      `[data-testid="show-card"][data-subject-id="${id}"]`
    )
  }

  async openDetails(card: Locator): Promise<void> {
    await card.locator('h3').first().click()
  }
}
