import type { Locator, Page } from '@playwright/test'

export class OptionsPage {
  constructor(private readonly page: Page) {}

  menuRow(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name })
  }

  async openSubPage(name: string | RegExp): Promise<void> {
    await this.menuRow(name).click()
  }

  // Exact match so a row's caption leaf is selected rather than its
  // enclosing button (whose text also contains the title).
  subtitle(text: string): Locator {
    return this.page.getByText(text, { exact: true })
  }

  // Player page renders its toggles in settingConfigs.player order:
  // index 0 is "Show skip button", index 1 is "Show danmaku density".
  // The switches carry no accessible label, so positional lookup is the
  // stable handle.
  toggle(index: number): Locator {
    return this.page.locator('input[type="checkbox"]').nth(index)
  }
}
