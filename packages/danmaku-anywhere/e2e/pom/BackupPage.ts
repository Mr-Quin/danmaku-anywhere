import type { Download, Page } from '@playwright/test'

const SELECTORS = {
  restoreInput: '[data-testid="backup-restore-input"]',
  exportButton: '[data-testid="backup-export-button"]',
}

interface FilePayload {
  name: string
  mimeType: string
  buffer: Buffer
}

// The /options/backup sub-page. Restore drives a hidden file input wired to
// the backupImport RPC.
export class BackupPage {
  constructor(private readonly page: Page) {}

  async restoreFromFile(file: FilePayload): Promise<void> {
    await this.page.locator(SELECTORS.restoreInput).setInputFiles(file)
  }

  async exportToFile(): Promise<Download> {
    const download = this.page.waitForEvent('download')
    await this.page.locator(SELECTORS.exportButton).click()
    return download
  }
}
