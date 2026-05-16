import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  confirm: '[data-testid="dialog-confirm"]',
  cancel: '[data-testid="dialog-cancel"]',
  title: '[data-testid="dialog-title"]',
  content: '[data-testid="dialog-content"]',
}

interface ExpectOptions {
  timeout?: number
}

// POM for the global confirm Dialog (dialogStore-driven). expectVisible
// anchors on the confirm button — true for confirm-style dialogs only.
// Info dialogs without a confirm action need their own POM.
export class ConfirmDialog {
  constructor(private readonly page: Page) {}

  get confirmButton(): Locator {
    return this.page.locator(SELECTORS.confirm)
  }

  get cancelButton(): Locator {
    return this.page.locator(SELECTORS.cancel)
  }

  get title(): Locator {
    return this.page.locator(SELECTORS.title)
  }

  get body(): Locator {
    return this.page.locator(SELECTORS.content)
  }

  async expectVisible(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.confirmButton).toBeVisible({ timeout })
  }

  async expectHidden(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.confirmButton).toBeHidden({ timeout })
  }

  async expectTitle(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.title).toContainText(matcher, { timeout })
  }

  async expectBody(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.body).toContainText(matcher, { timeout })
  }

  async confirm(options: ExpectOptions = {}): Promise<void> {
    await this.expectVisible(options)
    await this.confirmButton.click()
  }

  async cancel(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.cancelButton).toBeVisible({ timeout })
    await this.cancelButton.click()
  }
}
