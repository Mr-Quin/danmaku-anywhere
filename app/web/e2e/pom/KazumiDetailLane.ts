import type { Locator, Page } from '@playwright/test'

// The kazumi playback lane (data-kind="player"): the video host, the episode
// list (each item carries data-episode), and prev/next controls.
export class KazumiDetailLane {
  readonly lane: Locator

  constructor(page: Page) {
    this.lane = page.locator('[data-testid="lane"][data-kind="player"]')
  }

  videoHost(): Locator {
    return this.lane.locator('[data-testid="video-player-host"]')
  }

  episodes(): Locator {
    return this.lane.locator('[data-testid="episode-item"]')
  }

  episode(index: number): Locator {
    return this.lane.locator(
      `[data-testid="episode-item"][data-episode="${index}"]`
    )
  }

  next(): Locator {
    return this.lane.locator('[data-testid="player-next"]')
  }

  prev(): Locator {
    return this.lane.locator('[data-testid="player-prev"]')
  }

  episodeTitle(): Locator {
    return this.lane.locator('#media-episode')
  }
}
