import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  treeItem: (id: string) => `[data-testid="tree-item-${id}"]`,
  treeItemPrefix: (prefix: string) => `[data-testid^="tree-item-${prefix}"]`,
  treeItemExpand: (id: string) => `[data-testid="tree-item-expand-${id}"]`,
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
  dialogConfirm: '[data-testid="dialog-confirm"]',
  multiselectToggle: '[data-testid="multiselect-toggle"]',
  multiselectSelectAll: '[data-testid="multiselect-select-all"]',
  bulkDelete: '[data-testid="mount-bulk-delete"]',
}

// Page object for the popup's default /mount route — the DanmakuTree
// (season/episode hierarchy with per-item context menus).
export class MountPage {
  constructor(private readonly page: Page) {}

  seasonItem(seasonId: number): Locator {
    return this.page.locator(SELECTORS.treeItem(`season-${seasonId}`))
  }

  seasonExpand(seasonId: number): Locator {
    return this.page.locator(SELECTORS.treeItemExpand(`season-${seasonId}`))
  }

  episodeItem(episodeId: number): Locator {
    return this.page.locator(SELECTORS.treeItem(`episode-${episodeId}`))
  }

  stubItem(seasonId: number, indexedId: string): Locator {
    return this.page.locator(
      SELECTORS.treeItem(`stub-${seasonId}-${indexedId}`)
    )
  }

  stubItemsFor(seasonId: number): Locator {
    return this.page.locator(SELECTORS.treeItemPrefix(`stub-${seasonId}-`))
  }

  async waitForSeason(seasonId: number, timeout = 10_000): Promise<Locator> {
    const item = this.seasonItem(seasonId)
    await expect(item).toBeVisible({ timeout })
    return item
  }

  // Open the per-item DrilldownMenu and click an action. The menu only
  // mounts while the item is hovered, so we hover first.
  async openItemMenu(item: Locator, actionId: string): Promise<void> {
    await item.hover()
    await item.locator(SELECTORS.drilldownButton).click()
    await this.page.locator(SELECTORS.menuItem(actionId)).click()
  }

  // Click the tree item's expand chevron to reveal children. RichTreeView
  // exposes an icon container that toggles expansion; clicking the content
  // area doesn't expand. No-op if already expanded.
  async expandSeason(seasonId: number): Promise<void> {
    const item = this.seasonItem(seasonId)
    if ((await item.getAttribute('aria-expanded')) === 'true') {
      return
    }
    await this.seasonExpand(seasonId).click()
    await expect(item).toHaveAttribute('aria-expanded', 'true', {
      timeout: 2_000,
    })
  }

  // Expand any tree item by its full itemId (e.g. 'season-custom',
  // 'folder-MyFolder'). No-op if already expanded.
  async expandItem(itemId: string): Promise<void> {
    const item = this.page.locator(SELECTORS.treeItem(itemId))
    if ((await item.getAttribute('aria-expanded')) === 'true') {
      return
    }
    await this.page.locator(SELECTORS.treeItemExpand(itemId)).click()
    await expect(item).toHaveAttribute('aria-expanded', 'true', {
      timeout: 2_000,
    })
  }

  folderItem(folderPath: string): Locator {
    return this.page.locator(SELECTORS.treeItem(`folder-${folderPath}`))
  }

  customEpisodeItem(episodeId: number): Locator {
    return this.page.locator(SELECTORS.treeItem(`custom-episode-${episodeId}`))
  }

  // Confirm the active MUI delete/confirm dialog. The Dialog renders in a
  // portal, so the testid is looked up at the page level (not scoped to a
  // tree item). Waits for the button to be visible first — without the
  // explicit wait, a regression that no longer opens a dialog hangs on
  // Playwright's default 30s auto-wait instead of failing fast.
  async confirmDialog(timeout = 5_000): Promise<void> {
    const confirm = this.page.locator(SELECTORS.dialogConfirm)
    await expect(confirm).toBeVisible({ timeout })
    await confirm.click()
  }

  async enterMultiSelect(): Promise<void> {
    await this.page.locator(SELECTORS.multiselectToggle).click()
    await expect(this.page.locator(SELECTORS.multiselectSelectAll)).toBeVisible(
      { timeout: 2_000 }
    )
  }

  async selectAll(): Promise<void> {
    await this.page.locator(SELECTORS.multiselectSelectAll).click()
  }

  async bulkDelete(): Promise<void> {
    await this.page.locator(SELECTORS.bulkDelete).click()
  }
}
