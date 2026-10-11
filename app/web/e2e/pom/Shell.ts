import type { Locator, Page } from '@playwright/test'
import { DebugOverlay } from './DebugOverlay'
import { DetailsLane } from './DetailsLane'
import { KazumiDetailLane } from './KazumiDetailLane'
import { KazumiSearchLane } from './KazumiSearchLane'
import { LaneContainer } from './LaneContainer'
import { TrendingLane } from './TrendingLane'

// Composed root POM. Specs reach lanes and chrome through here rather than
// hand-rolling selectors. Prefer adding a method over a raw locator in a spec.
export class Shell {
  readonly lanes: LaneContainer
  readonly debug: DebugOverlay
  readonly trending: TrendingLane
  readonly details: DetailsLane
  readonly kazumiSearch: KazumiSearchLane
  readonly kazumiDetail: KazumiDetailLane

  constructor(private readonly page: Page) {
    this.lanes = new LaneContainer(page)
    this.debug = new DebugOverlay(page)
    this.trending = new TrendingLane(page)
    this.details = new DetailsLane(page)
    this.kazumiSearch = new KazumiSearchLane(page)
    this.kazumiDetail = new KazumiDetailLane(page)
  }

  root(): Locator {
    return this.page.locator('[data-testid="app-shell"]')
  }

  sidebar(): Locator {
    return this.page.locator('[data-testid="sidebar"]')
  }

  appBar(): Locator {
    return this.page.locator('[data-testid="app-bar"]')
  }

  themeToggle(): Locator {
    return this.page.locator('[data-testid="theme-toggle"]')
  }

  searchTrigger(): Locator {
    return this.page.locator('[data-testid="search-trigger"]')
  }

  noExtensionPage(): Locator {
    return this.page.locator('[data-testid="no-extension-page"]')
  }
}
