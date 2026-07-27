import { expect, type Locator, type Page } from '@playwright/test'

// Matches the comment-count label in either zh ("条弹幕") or en ("comments").
const COMMENT_LABEL = '条弹幕|comments?'

const SELECTORS = {
  episodeForProvider: (provider: string) =>
    `[data-testid^="episode-list-item-${provider}-"]`,
}

function exactCountRe(count: number): RegExp {
  return new RegExp(`^${count}\\s*(${COMMENT_LABEL})$`, 'i')
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

  // Target the caption element, not the row: adjacent nodes concatenate, so
  // an episode numbered 1 whose caption reads "0条弹幕" matches as "10条弹幕".
  // EpisodeTreeItem reuses this testid for a bare number, so the label match
  // below only holds for season-details rows.
  private countCaption(episode: Locator): Locator {
    return episode.getByTestId('comment-count')
  }

  async expectCommentCountToBe(
    episode: Locator,
    count: number,
    timeout = 15_000
  ): Promise<void> {
    await expect(this.countCaption(episode)).toHaveText(exactCountRe(count), {
      timeout,
    })
  }
}
