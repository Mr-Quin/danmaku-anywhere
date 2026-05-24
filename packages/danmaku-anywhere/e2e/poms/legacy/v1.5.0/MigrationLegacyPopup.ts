import type { BrowserContext, Page } from '@playwright/test'

const SUCCESS_TOAST = '[role="alert"].MuiAlert-colorSuccess'
const ERROR_TOAST = '[role="alert"].MuiAlert-colorError'
const TOAST_TIMEOUT = 5_000

/**
 * v1.5.0 popup, the two flows the migration smoke needs to seed real
 * user state from outside the SW. Frozen against v1.5.0's UI.
 */
export class MigrationLegacyPopup {
  private constructor(
    private readonly page: Page,
    private readonly extensionId: string
  ) {}

  static async open(
    context: BrowserContext,
    extensionId: string
  ): Promise<MigrationLegacyPopup> {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/pages/popup.html#/mount`)
    await page.locator('#root').waitFor({ state: 'visible', timeout: 5_000 })
    return new MigrationLegacyPopup(page, extensionId)
  }

  async restoreBackup(jsonPath: string): Promise<void> {
    await this.navigateHash('/options/backup')
    await this.page
      .locator('input[type="file"][accept=".json"]')
      .setInputFiles(jsonPath)
    await this.expectSuccessToast()
  }

  async importDanmaku(zipPath: string): Promise<void> {
    await this.navigateHash('/mount')
    await this.page
      .locator('input[type="file"][accept=".json,.xml,.zip"]')
      .setInputFiles(zipPath)
    // v1.5.0 opens a parse-result dialog and requires confirming before
    // rows commit to IDB. The confirm label is localized.
    await this.page
      .getByRole('button', { name: /^(Confirm Import|确认导入)$/ })
      .click()
    await this.expectSuccessToast()
  }

  async close(): Promise<void> {
    await this.page.close()
  }

  private async navigateHash(hash: string): Promise<void> {
    await this.page.goto(
      `chrome-extension://${this.extensionId}/pages/popup.html#${hash}`,
      { waitUntil: 'domcontentloaded' }
    )
  }

  private async expectSuccessToast(): Promise<void> {
    // Single combined locator avoids racing two waitFors (the loser's
    // timeout would land as an unhandled rejection).
    await this.page
      .locator(`${SUCCESS_TOAST}, ${ERROR_TOAST}`)
      .waitFor({ timeout: TOAST_TIMEOUT })
    const errorToast = this.page.locator(ERROR_TOAST)
    if (await errorToast.isVisible()) {
      throw new Error(
        `v1.5.0 surfaced an error toast: ${(await errorToast.textContent()) ?? '(no text)'}`
      )
    }
  }
}
