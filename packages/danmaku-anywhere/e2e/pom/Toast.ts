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

  // The in-page toast container. Collapsed, the newest toast sits in front with
  // older ones peeking out behind; hover or focus spreads them out.
  pile(): Locator {
    return this.page.getByTestId('toast-pile')
  }

  // Stays the same when a keyed toast is replaced in place.
  async keyOf(toast: Locator): Promise<string | null> {
    return toast.getAttribute('data-toast-key')
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
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(
      this.bySeverity('success').filter({ hasText: matcher })
    ).toBeVisible({ timeout })
  }

  async expectWarning(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(
      this.bySeverity('warning').filter({ hasText: matcher })
    ).toBeVisible({ timeout })
  }

  async expectError(
    matcher: string | RegExp,
    options: ExpectOptions = {}
  ): Promise<void> {
    const { timeout = 5_000 } = options
    await expect(
      this.bySeverity('error').filter({ hasText: matcher })
    ).toBeVisible({ timeout })
  }
}
