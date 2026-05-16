import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  confirm: '[data-testid="import-result-confirm"]',
}

interface ExpectOptions {
  timeout?: number
}

export class ImportResultDialog {
  constructor(private readonly page: Page) {}

  get confirmButton(): Locator {
    return this.page.locator(SELECTORS.confirm)
  }

  async expectVisible(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.confirmButton).toBeVisible({ timeout })
  }

  async confirm(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await this.expectVisible({ timeout })
    await this.confirmButton.click({ timeout })
  }
}
