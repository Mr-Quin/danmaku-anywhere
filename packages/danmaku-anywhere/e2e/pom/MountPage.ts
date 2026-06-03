import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  treeItem: (id: string) => `[data-testid="tree-item-${id}"]`,
  treeItemPrefix: (prefix: string) => `[data-testid^="tree-item-${prefix}"]`,
  treeItemExpand: (id: string) => `[data-testid="tree-item-expand-${id}"]`,
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
  multiselectToggle: '[data-testid="multiselect-toggle"]',
  multiselectSelectAll: '[data-testid="multiselect-select-all"]',
  bulkDelete: '[data-testid="mount-bulk-delete"]',
}

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

  episodeCommentCount(episodeId: number): Locator {
    return this.episodeItem(episodeId).getByTestId('comment-count')
  }

  episodeItems(): Locator {
    return this.page.locator(SELECTORS.treeItemPrefix('episode-'))
  }

  stubItem(seasonId: number, indexedId: string): Locator {
    return this.page.locator(
      SELECTORS.treeItem(`stub-${seasonId}-${indexedId}`)
    )
  }

  stubItemsFor(seasonId: number): Locator {
    return this.page.locator(SELECTORS.treeItemPrefix(`stub-${seasonId}-`))
  }

  async waitForSeason(seasonId: number): Promise<Locator> {
    const item = this.seasonItem(seasonId)
    await expect(item).toBeVisible()
    return item
  }

  // Right-click opens the DrilldownContextMenu (Popper, no Modal/Backdrop).
  // The IconButton path uses a Modal whose Backdrop intercepts pointer
  // events during its close transition — flaky under xvfb. Same DAMenuItem
  // entries either way, so right-click is the stable path.
  async openItemMenu(item: Locator, actionId: string): Promise<void> {
    await item.click({ button: 'right' })
    const menuItem = this.page.locator(SELECTORS.menuItem(actionId))
    await menuItem.click()
    await expect(menuItem).toBeHidden()
  }

  async openToolbarMenu(actionId: string): Promise<void> {
    await this.page.locator(SELECTORS.drilldownButton).click()
    const menuItem = this.page.locator(SELECTORS.menuItem(actionId))
    await menuItem.click()
    await expect(menuItem).toBeHidden()
  }

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
