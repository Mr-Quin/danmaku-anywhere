import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  searchInput: '[data-testid="search-input"]',
  searchSubmit: '[data-testid="search-submit"]',
  parseSubmit: '[data-testid="parse-submit"]',
  seasonCardForProvider: (provider: string) =>
    `[data-testid^="season-card-${provider}-"]`,
  seasonCardAction: '[data-testid="season-card-action"]',
}

export class SearchPage {
  constructor(private readonly page: Page) {}

  get input(): Locator {
    return this.page.locator(SELECTORS.searchInput)
  }

  get submitButton(): Locator {
    return this.page.locator(SELECTORS.searchSubmit)
  }

  get parseButton(): Locator {
    return this.page.locator(SELECTORS.parseSubmit)
  }

  // Enter, not click: the autocomplete dropdown can intercept the submit
  // button when open.
  async submit(term: string): Promise<void> {
    await this.input.fill(term)
    await this.input.press('Enter')
  }

  async submitUrl(url: string): Promise<void> {
    await this.input.fill(url)
    await this.parseButton.click()
  }

  // `impl` is the DanmakuSourceType enum value: 'Bilibili', 'DanDanPlay', 'Tencent'.
  sourceChip(impl: string): Locator {
    return this.page.locator(`[data-testid="source-chip-${impl}"]`)
  }

  get overflowChip(): Locator {
    return this.page.locator('[data-testid="source-chip-overflow"]')
  }

  // `providerId` is the config id, e.g. 'tencent'.
  overflowMenuItem(providerId: string): Locator {
    return this.page.locator(
      `[data-testid="drilldown-menu-item-${providerId}"]`
    )
  }

  historyOption(text: string): Locator {
    return this.page.getByRole('option', { name: text })
  }

  seasonCard(provider: string): Locator {
    return this.page.locator(SELECTORS.seasonCardForProvider(provider)).first()
  }

  async openFirstResult(provider: string, timeout = 15_000): Promise<void> {
    const card = this.seasonCard(provider)
    await expect(card).toBeVisible({ timeout })
    await card.locator(SELECTORS.seasonCardAction).click()
  }
}
