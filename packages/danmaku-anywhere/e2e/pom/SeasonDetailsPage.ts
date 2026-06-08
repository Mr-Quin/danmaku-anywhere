import { expect, type Locator, type Page } from '@playwright/test'

// Matches the comment-count label in either zh ("条弹幕") or en ("comments").
const COMMENT_LABEL = '条弹幕|comments?'

const SELECTORS = {
  episodeForProvider: (provider: string) =>
    `[data-testid^="episode-list-item-${provider}-"]`,
  COMMENT_COUNT_RE: new RegExp(`\\d+\\s*(${COMMENT_LABEL})`, 'i'),
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
      new RegExp(`^${count}\\s*(${COMMENT_LABEL})$`, 'i')
    )
    await expect(countNode).toBeVisible({ timeout })
  }
}
