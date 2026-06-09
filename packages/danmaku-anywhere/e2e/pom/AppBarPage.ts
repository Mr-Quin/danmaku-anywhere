import type { Locator, Page } from '@playwright/test'

export class AppBarPage {
  constructor(private readonly page: Page) {}

  private openInNewButton(): Locator {
    return this.page.getByTestId('open-in-new-button')
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
