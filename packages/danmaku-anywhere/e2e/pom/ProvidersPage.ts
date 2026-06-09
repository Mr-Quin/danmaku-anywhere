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

  // Stops before confirming; the caller confirms via `popup.dialog`.
  async deleteProvider(name: string | RegExp): Promise<void> {
    const installedRow = this.page
      .getByRole('listitem')
      .filter({ hasText: name })
    await installedRow.getByTestId('drilldown-menu-button').click()
    await this.page.getByTestId('drilldown-menu-item-delete').click()
  }

  filter(query: string): Promise<void> {
    return this.page.getByPlaceholder(/Filter sources|筛选/).fill(query)
  }

  catalogRow(name: string | RegExp): Locator {
    return this.page.getByRole('listitem').filter({ hasText: name })
  }

  importButton(name: string | RegExp): Locator {
    return this.catalogRow(name).getByRole('button', {
      name: /^(Import|导入)$/,
    })
  }

  async import(name: string | RegExp): Promise<void> {
    await this.importButton(name).click()
  }

  async refreshCatalog(): Promise<void> {
    await this.page.getByRole('button', { name: /^(Refresh|刷新)$/ }).click()
  }

  updateButton(): Locator {
    return this.page.getByRole('button', { name: /^(Update|更新)$/ })
  }

  async update(): Promise<void> {
    await this.updateButton().click()
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
    await this.saveButton().click()
  }

  saveButton(): Locator {
    return this.page.getByRole('button', { name: SAVE_BUTTON })
  }

  async authorManifest(): Promise<void> {
    await this.page
      .getByRole('button', { name: /Add|添加/ })
      .first()
      .click()
    await this.page
      .getByRole('menuitem', { name: /Author a manifest|新建配置/ })
      .click()
  }

  manifestJsonField(): Locator {
    return this.page.getByLabel(/Manifest JSON|配置 JSON/)
  }

  setManifestJson(value: string): Promise<void> {
    return this.manifestJsonField().fill(value)
  }

  manifestValid(): Locator {
    return this.page.getByText(/Manifest is valid|配置有效/)
  }

  manifestJsonError(): Locator {
    return this.page.getByText(/Invalid JSON|JSON 格式错误/)
  }

  customChip(): Locator {
    return this.page.getByText(/^(Custom|自定义)$/)
  }
}
