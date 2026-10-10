import fs from 'node:fs/promises'
import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'

const SUCCESS_TOAST = '[role="alert"].MuiAlert-colorSuccess'
const ERROR_TOAST = '[role="alert"].MuiAlert-colorError'
const TOAST_TIMEOUT = 5_000

// v1.5.0's SeasonMapSnapshot: seasons is keyed by provider config id.
export interface LegacySeasonMapSnapshot {
  key: string
  seasons: Record<string, number>
  seasonIds: number[]
}

/**
 * v1.5.0 popup, the flows the migration specs need to seed real user state
 * from outside the SW. Frozen against v1.5.0's UI.
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

  async exportBackup(): Promise<unknown> {
    await this.navigateHash('/options/backup')
    const download = this.page.waitForEvent('download')
    await this.page
      .getByRole('button', { name: /^(Export Backup|导出备份)$/ })
      .click()
    const file = await (await download).path()
    return JSON.parse(await fs.readFile(file, 'utf8'))
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

  // Rows carry no list semantics, so the row is the innermost element that
  // holds both the name and a switch. Built-in rows render a localized source
  // name, so callers match both locales.
  async toggleProvider(name: RegExp): Promise<void> {
    await this.navigateHash('/providers')
    // Writes from a popup opened on a fresh install hang until it reloads.
    await this.page.reload({ waitUntil: 'domcontentloaded' })
    const checkbox = this.page.locator('input[type="checkbox"]')
    const toggle = this.page
      .locator('*', { has: this.page.getByText(name) })
      .filter({ has: checkbox })
      .last()
      .locator(checkbox)
    const wasChecked = await toggle.isChecked()
    await toggle.click()
    await expect(toggle).toBeChecked({ checked: !wasChecked })
  }

  // v1.5.0 only creates a title mapping from the content script's floating
  // panel, after a search on a page whose title the integration recognized.
  // This sends the seasonMapAdd RPC that panel sends, so v1.5.0's own service
  // worker writes the row, and then checks v1.5.0's title mapping page lists it.
  async addTitleMapping(snapshot: LegacySeasonMapSnapshot): Promise<void> {
    await this.navigateHash('/mount')
    const response = await this.page.evaluate((input) => {
      return chrome.runtime.sendMessage({ method: 'seasonMapAdd', input })
    }, snapshot)
    if ((response as { state?: string } | undefined)?.state !== 'success') {
      throw new Error(`v1.5.0 seasonMapAdd failed: ${JSON.stringify(response)}`)
    }
    await this.navigateHash('/title-mapping')
    // The mapping list is cached across hash routes; a reload refetches it.
    await this.page.reload({ waitUntil: 'domcontentloaded' })
    await expect(
      this.page.getByText(snapshot.key, { exact: true })
    ).toBeVisible()
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
