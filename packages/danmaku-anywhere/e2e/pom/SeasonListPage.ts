import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  seasonCardForProvider: (provider: string) =>
    `[data-testid^="season-card-${provider}-"]`,
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
}

// Page object for /danmaku — grid of persisted seasons with per-card menu.
export class SeasonListPage {
  constructor(private readonly page: Page) {}

  card(provider: string): Locator {
    return this.page.locator(SELECTORS.seasonCardForProvider(provider)).first()
  }

  async waitForFirstCard(provider: string, timeout = 10_000): Promise<Locator> {
    const card = this.card(provider)
    await expect(card).toBeVisible({ timeout })
    return card
  }

  async openMenu(card: Locator): Promise<void> {
    await card.locator(SELECTORS.drilldownButton).click()
  }

  async clickMenuItem(itemId: string): Promise<void> {
    // Menu portal is at document root, not inside the card.
    await this.page.locator(SELECTORS.menuItem(itemId)).click()
  }

  async openCardMenu(card: Locator, itemId: string): Promise<void> {
    await this.openMenu(card)
    await this.clickMenuItem(itemId)
  }
}
