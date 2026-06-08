import type { Locator, Page } from '@playwright/test'

export class AppBarPage {
  constructor(private readonly page: Page) {}

  // The mount tab has its own drilldown toolbar, so scope to the app bar banner
  // to keep this button unambiguous.
  private openInNewButton(): Locator {
    return this.page
      .getByRole('banner')
      .locator('[data-testid="drilldown-menu-button"]')
  }

  async openOpenInNewMenu(): Promise<void> {
    await this.openInNewButton().click()
  }

  openInNewWindowItem(): Locator {
    return this.page.getByTestId('drilldown-menu-item-open-in-window')
  }

  openInNewTabItem(): Locator {
    return this.page.getByTestId('drilldown-menu-item-open-in-tab')
  }
}
