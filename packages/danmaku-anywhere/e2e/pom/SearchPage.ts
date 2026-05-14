import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  searchInput: '[data-testid="search-input"]',
  searchSubmit: '[data-testid="search-submit"]',
  // Season cards are testid'd as `season-card-{provider}-{idOrIndexedId}`.
  seasonCardForProvider: (provider: string) =>
    `[data-testid^="season-card-${provider}-"]`,
}

// Page object for the popup's /search route — search input, submit, results.
export class SearchPage {
  constructor(private readonly page: Page) {}

  get input(): Locator {
    return this.page.locator(SELECTORS.searchInput)
  }

  get submitButton(): Locator {
    return this.page.locator(SELECTORS.searchSubmit)
  }

  // Pressing Enter avoids fighting the autocomplete dropdown that intercepts
  // pointer events on the submit button.
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
