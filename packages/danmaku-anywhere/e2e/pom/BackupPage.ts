import type { Page } from '@playwright/test'

const SELECTORS = {
  restoreInput: '[data-testid="backup-restore-input"]',
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
}
