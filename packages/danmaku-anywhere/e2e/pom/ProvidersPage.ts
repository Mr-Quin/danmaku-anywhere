import { expect, type Locator, type Page } from '@playwright/test'

const SAVE_BUTTON = /^(Save|保存)$/

// POM for the providers list (#/providers) and the generic provider config
// editor. Form fields are driven by the manifest's configSchema, so they are
// addressed by their schema-derived label (title) rather than a fixed testid.
export class ProvidersPage {
  constructor(private readonly page: Page) {}

  row(name: string | RegExp): Locator {
    return this.page.getByText(name, { exact: typeof name === 'string' })
  }

  async edit(name: string | RegExp): Promise<void> {
    await this.row(name).first().click()
  }

  field(label: string | RegExp): Locator {
    return this.page.getByLabel(label)
  }

  nameField(): Locator {
    return this.page.getByLabel(/Name|名称/)
  }

  async expectFieldVisible(label: string | RegExp): Promise<void> {
    await expect(this.field(label)).toBeVisible()
  }

  async fillField(label: string | RegExp, value: string): Promise<void> {
    await this.field(label).fill(value)
  }

  async selectOption(
    label: string | RegExp,
    optionName: string | RegExp
  ): Promise<void> {
    await this.field(label).click()
    await this.page
      .getByRole('option', { name: optionName, exact: true })
      .click()
  }

  async addArrayItem(): Promise<void> {
    await this.page
      .locator('form')
      .getByRole('button', { name: /^(Add|添加)$/ })
      .click()
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: SAVE_BUTTON }).click()
  }
}
