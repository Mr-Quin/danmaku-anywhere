import { expect, type Locator, type Page } from '@playwright/test'

const SELECTORS = {
  episodeForProvider: (provider: string) =>
    `[data-testid^="episode-list-item-${provider}-"]`,
  // Matches either zh ("X条弹幕") or en ("X comments") locales.
  COMMENT_COUNT_RE: /\d+\s*(条弹幕|comments?)/i,
}

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

  async expectCommentCountToBe(
    episode: Locator,
    count: number,
    timeout = 15_000
  ): Promise<void> {
    // Scope to the count caption: the flattened button text merges the
    // episode number with the count (e.g. "第1集" + "1" + "2条弹幕").
    const countNode = episode.getByText(
      new RegExp(`^${count}\\s*(条弹幕|comments?)$`, 'i')
    )
    await expect(countNode).toBeVisible({ timeout })
  }
}
