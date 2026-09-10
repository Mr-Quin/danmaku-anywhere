import type { Locator, Page } from '@playwright/test'

interface StoreSnapshot {
  columns: Array<{ id: string; kind: string }>
  activeId: string | null
  playing: { title: string; episode: number } | null
  floating: boolean
  backendMode: string
  theme: string
}

// Reads the in-app debug overlay. Its debug-* testids and debug-store-json are
// complementary ground-truth: they pin the lane store so a UI bug can't mask a
// state bug. The overlay auto-opens with ?debug=1; otherwise click the fab.
export class DebugOverlay {
  readonly panel: Locator

  constructor(private readonly page: Page) {
    this.panel = page.locator('[data-testid="debug-overlay"]')
  }

  async open(): Promise<void> {
    if (await this.panel.isVisible()) {
      return
    }
    await this.page.locator('da-debug-overlay .fab').click()
    await this.panel.waitFor({ state: 'visible' })
  }

  backendMode(): Locator {
    return this.page.locator('[data-testid="debug-backend-mode"]')
  }

  theme(): Locator {
    return this.page.locator('[data-testid="debug-theme"]')
  }

  activeId(): Locator {
    return this.page.locator('[data-testid="debug-active-id"]')
  }

  playing(): Locator {
    return this.page.locator('[data-testid="debug-playing"]')
  }

  columns(): Locator {
    return this.page.locator(
      '[data-testid="debug-columns"] [data-testid="debug-column"]'
    )
  }

  calls(): Locator {
    return this.page.locator(
      '[data-testid="debug-backend-calls"] [data-testid="debug-call"]'
    )
  }

  async snapshot(): Promise<StoreSnapshot> {
    const text = await this.page
      .locator('[data-testid="debug-store-json"]')
      .textContent()
    if (!text) {
      throw new Error('debug-store-json was empty')
    }
    return JSON.parse(text) as StoreSnapshot
  }
}
