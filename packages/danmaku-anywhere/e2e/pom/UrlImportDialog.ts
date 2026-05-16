import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  title: '[data-testid="url-import-title"]',
  input: '[data-testid="url-import-input"]',
  submit: '[data-testid="url-import-submit"]',
  helper: '[data-testid="url-import-helper"]',
}

interface ExpectOptions {
  timeout?: number
}

export class UrlImportDialog {
  constructor(private readonly page: Page) {}

  get title(): Locator {
    return this.page.locator(SELECTORS.title)
  }

  get input(): Locator {
    return this.page.locator(SELECTORS.input)
  }

  get submitButton(): Locator {
    return this.page.locator(SELECTORS.submit)
  }

  get helper(): Locator {
    return this.page.locator(SELECTORS.helper)
  }

  async expectHelperText(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.helper).toContainText(matcher, { timeout })
  }

  async expectVisible(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.title).toBeVisible({ timeout })
  }

  async expectHidden(options: ExpectOptions = {}): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.title).toBeHidden({ timeout })
  }

  async fillUrl(url: string): Promise<void> {
    await this.input.fill(url)
  }

  async submit(): Promise<void> {
    await this.submitButton.click()
  }
}
