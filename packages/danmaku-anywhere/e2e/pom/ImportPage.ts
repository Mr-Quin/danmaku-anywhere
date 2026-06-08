import type { Page } from '@playwright/test'
import { ImportResultDialog } from './ImportResultDialog'

const SELECTORS = {
  fileInput: '[data-testid="danmaku-import-file-input"]',
}

// The standalone danmaku import page (#/import). Opened detached so it fills
// the viewport and the file picker runs in-place.
export class ImportPage {
  readonly result: ImportResultDialog

  private constructor(private readonly page: Page) {
    this.result = new ImportResultDialog(page)
  }

  static async open(page: Page, extensionId: string): Promise<ImportPage> {
    await page.goto(
      `chrome-extension://${extensionId}/pages/popup.html?detached=1#/import`
    )
    await page.locator('#root').waitFor({ state: 'visible' })
    return new ImportPage(page)
  }

  async selectFiles(files: string | string[]): Promise<void> {
    await this.page.locator(SELECTORS.fileInput).setInputFiles(files)
  }
}
