import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  // EpisodeList.tsx tags DataGrid rows via getRowClassName as
  // `episode-row episode-row-<provider>-<id>`.
  episodeForProvider: (provider: string) =>
    `[class*="episode-row-${provider}-"]`,
  drilldownButton: '[data-testid="drilldown-menu-button"]',
  menuItem: (id: string) => `[data-testid="drilldown-menu-item-${id}"]`,
  COMMENT_COUNT_RE: /\d+\s*(条弹幕|comments?)/i,
}

// Page object for /danmaku/:seasonId — list of episodes for a season with
// per-row menu (refresh, backup, exportXml, delete).
export class EpisodeListPage {
  constructor(private readonly page: Page) {}

  episode(provider: string): Locator {
    return this.page.locator(SELECTORS.episodeForProvider(provider)).first()
  }

  async waitForFirstEpisode(
    provider: string,
    timeout = 10_000
  ): Promise<Locator> {
    const ep = this.episode(provider)
    await expect(ep).toBeVisible({ timeout })
    return ep
  }

  async openMenu(episode: Locator): Promise<void> {
    await episode.locator(SELECTORS.drilldownButton).click()
  }

  async clickMenuItem(itemId: string): Promise<void> {
    await this.page.locator(SELECTORS.menuItem(itemId)).click()
  }

  async openEpisodeMenu(episode: Locator, itemId: string): Promise<void> {
    await this.openMenu(episode)
    await this.clickMenuItem(itemId)
  }

  async expectCommentCount(episode: Locator, timeout = 15_000): Promise<void> {
    await expect(episode).toContainText(SELECTORS.COMMENT_COUNT_RE, { timeout })
  }
}
