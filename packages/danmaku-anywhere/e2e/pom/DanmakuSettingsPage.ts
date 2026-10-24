import type { Locator, Page } from '@playwright/test'

export class DanmakuSettingsPage {
  constructor(private readonly page: Page) {}

  async openBlockTab(): Promise<void> {
    await this.page.getByRole('tab', { name: /^(Block|屏蔽)$/ }).click()
  }

  // A rule row's text is truncated with an ellipsis, so the full rule is
  // matched on the title it carries.
  blockRule(rule: { type: 'text' | 'regex'; value: string }): Locator {
    const display = rule.type === 'regex' ? `/${rule.value}/` : rule.value
    return this.page.getByTitle(display, { exact: true })
  }
}
