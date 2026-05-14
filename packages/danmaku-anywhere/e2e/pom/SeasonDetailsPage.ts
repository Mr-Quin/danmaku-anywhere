import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  episodeForProvider: (provider: string) =>
    `[data-testid^="episode-list-item-${provider}-"]`,
  // Tolerate either i18n locale (zh: "条弹幕", en: "comment(s)").
  COMMENT_COUNT_RE: /\d+\s*(条弹幕|comments?)/i,
}

// Page object for /search/season — episode list and per-episode danmaku fetch.
export class SeasonDetailsPage {
  constructor(private readonly page: Page) {}

  episode(provider: string): Locator {
    return this.page.locator(SELECTORS.episodeForProvider(provider)).first()
  }

  async fetchDanmakuForFirstEpisode(
    provider: string,
    timeout = 15_000
  ): Promise<Locator> {
    const ep = this.episode(provider)
    await expect(ep).toBeVisible({ timeout })
    await ep.click()
    return ep
  }

  async expectCommentCount(episode: Locator, timeout = 15_000): Promise<void> {
    await expect(episode).toContainText(SELECTORS.COMMENT_COUNT_RE, { timeout })
  }
}
