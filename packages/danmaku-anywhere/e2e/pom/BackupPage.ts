import type { Download, Locator, Page } from '@playwright/test'

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
    const button = this.page.locator(SELECTORS.exportButton)
    await waitForSlideIn(button)
    const download = this.page.waitForEvent('download')
    await button.click()
    return download
  }
}

// Options sub-pages slide in when they mount. Playwright can aim a click at
// the button while it is still moving and land beside it, so nothing fires.
async function waitForSlideIn(target: Locator): Promise<void> {
  await target.evaluate(async (element) => {
    const running: Animation[] = []
    for (let node: Element | null = element; node; node = node.parentElement) {
      running.push(...node.getAnimations())
    }
    await Promise.allSettled(running.map((animation) => animation.finished))
  })
}
