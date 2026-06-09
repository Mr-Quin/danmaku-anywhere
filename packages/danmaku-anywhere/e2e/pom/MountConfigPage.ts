import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
}

const ADD = /^(Add|添加)$/
const NEXT = /^(Next|下一步)$/
const SAVE = /^(Save|保存)$/
const ADD_PATTERN = /^(Add Pattern|添加模式)$/
const NAME_LABEL = /Name|名称/
const PATTERN_LABEL = /(Pattern|模式) 1/

// POM for the mount-config list (#/config) and the stepper-based config editor
// (#/config/add, #/config/edit). List rows carry no testid, so they are
// addressed by the config name they render; the per-row action menu and the
// editor's stepper buttons are stable across locales via role + name.
export class MountConfigPage {
  constructor(private readonly page: Page) {}

  // The row is a MUI ListItem (<li>) whose clickable body nests a button, so
  // the implicit listitem role is lost; match the <li> tag directly instead.
  // Exact text match keeps a name that is a substring of another from
  // resolving two rows.
  row(name: string): Locator {
    return this.page
      .locator('li')
      .filter({ has: this.page.getByText(name, { exact: true }) })
  }

  async expectRow(name: string): Promise<void> {
    await expect(this.row(name)).toBeVisible()
  }

  async startAdd(): Promise<void> {
    await this.page.getByRole('button', { name: ADD }).click()
  }

  async openEditor(name: string): Promise<void> {
    await this.row(name).getByText(name, { exact: true }).click()
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByLabel(NAME_LABEL).fill(name)
  }

  async addPattern(value: string): Promise<void> {
    await this.page.getByRole('button', { name: ADD_PATTERN }).click()
    await this.page.getByLabel(PATTERN_LABEL).fill(value)
  }

  async next(): Promise<void> {
    await this.page.getByRole('button', { name: NEXT }).click()
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: SAVE }).click()
  }

  async openRowMenu(name: string, actionId: string): Promise<void> {
    await this.row(name).locator(SELECTORS.drilldownButton).click()
    await this.page.locator(SELECTORS.menuItem(actionId)).click()
  }
}
