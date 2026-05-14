import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  treeItem: (id: string) => `[data-testid="tree-item-${id}"]`,
  treeItemPrefix: (prefix: string) => `[data-testid^="tree-item-${prefix}"]`,
  treeItemExpand: (id: string) => `[data-testid="tree-item-expand-${id}"]`,
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
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
}
