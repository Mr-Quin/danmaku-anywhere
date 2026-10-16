import { expect, type Locator, type Page } from '@playwright/test'

export class OptionsUpgradeScreen {
  constructor(private readonly page: Page) {}

  pending(): Locator {
    return this.page.getByTestId('options-upgrade-pending')
  }

  failed(): Locator {
    return this.page.getByTestId('options-upgrade-failed')
  }

  retryButton(): Locator {
    return this.failed().getByRole('button', { name: /^(Retry|重试)$/ })
  }

  async expectUpgraded(options: { timeout?: number } = {}): Promise<void> {
    await expect(this.page.getByTestId('popup-layout')).toBeVisible(options)
    await expect(this.pending()).toBeHidden(options)
    await expect(this.failed()).toBeHidden()
  }
}
