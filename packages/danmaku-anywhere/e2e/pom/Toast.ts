import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  snackbar: '[data-testid="snackbar"]',
  bySeverity: (s: string) => `[data-testid="snackbar"][data-severity="${s}"]`,
}

type Severity = 'success' | 'error' | 'warning' | 'info'

interface ExpectOptions {
  timeout?: number
}

// POM for the global Snackbar (toastStore-driven). Snackbars stack and
// render in a portal, so all locators are page-scoped.
export class Toast {
  constructor(private readonly page: Page) {}

  all(): Locator {
    return this.page.locator(SELECTORS.snackbar)
  }

  bySeverity(severity: Severity): Locator {
    return this.page.locator(SELECTORS.bySeverity(severity))
  }

  async expectVisible(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(this.all().filter({ hasText: matcher })).toBeVisible({
      timeout,
    })
  }

  async expectSuccess(
    matcher?: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    const locator =
      matcher === undefined
        ? this.bySeverity('success')
        : this.bySeverity('success').filter({ hasText: matcher })
    await expect(locator.first()).toBeVisible({ timeout })
  }

  async expectError(
    matcher?: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    const locator =
      matcher === undefined
        ? this.bySeverity('error')
        : this.bySeverity('error').filter({ hasText: matcher })
    await expect(locator.first()).toBeVisible({ timeout })
  }

  // Click each visible toast's close button and wait for them to leave the
  // DOM. Use between back-to-back identical-text mutations so the second
  // expectSuccess() can't pass on the first toast lingering through its
  // autoHideDuration (default 3500ms, see toastStore.notify).
  async dismissAll(timeout = 5_000): Promise<void> {
    const closeButtons = this.all().getByRole('button', { name: 'Close' })
    const count = await closeButtons.count()
    for (let i = 0; i < count; i++) {
      await closeButtons.first().click()
    }
    await expect(this.all()).toHaveCount(0, { timeout })
  }
}
