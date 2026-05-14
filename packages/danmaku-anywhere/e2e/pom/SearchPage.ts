import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  searchInput: '[data-testid="search-input"]',
  searchSubmit: '[data-testid="search-submit"]',
  seasonCardForProvider: (provider: string) =>
    `[data-testid^="season-card-${provider}-"]`,
}

export class SearchPage {
  constructor(private readonly page: Page) {}

  get input(): Locator {
    return this.page.locator(SELECTORS.searchInput)
  }

  get submitButton(): Locator {
    return this.page.locator(SELECTORS.searchSubmit)
  }

  // Press Enter to submit; the autocomplete dropdown intercepts pointer
  // events on the submit button when it's open.
  async submit(term: string): Promise<void> {
    await this.input.fill(term)
    await this.input.press('Enter')
  }

  seasonCard(provider: string): Locator {
    return this.page.locator(SELECTORS.seasonCardForProvider(provider)).first()
  }

  async openFirstResult(provider: string, timeout = 15_000): Promise<void> {
    const card = this.seasonCard(provider)
    await expect(card).toBeVisible({ timeout })
    await card.click()
  }
}
