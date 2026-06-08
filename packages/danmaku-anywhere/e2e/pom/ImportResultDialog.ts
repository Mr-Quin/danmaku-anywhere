import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  confirm: '[data-testid="import-result-confirm"]',
  success: '[data-testid="import-result-success"]',
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

  // A backup import parses and migrates every file before the result renders,
  // so a large fixture can take longer than the default expect timeout.
  async expectSuccess(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 15_000 } = options
    await expect(this.page.locator(SELECTORS.success)).toBeVisible({ timeout })
  }
}
