import type { Page } from '@playwright/test'
import { SearchPage } from './SearchPage'
import { SeasonDetailsPage } from './SeasonDetailsPage'

export class Popup {
  readonly search: SearchPage
  readonly seasonDetails: SeasonDetailsPage

  private constructor(page: Page) {
    this.search = new SearchPage(page)
    this.seasonDetails = new SeasonDetailsPage(page)
  }

  static async open(
    page: Page,
    extensionId: string,
    hashRoute = '/search'
  ): Promise<Popup> {
    await page.goto(
      `chrome-extension://${extensionId}/pages/popup.html#${hashRoute}`
    )
    await page.locator('#root').waitFor({ state: 'visible', timeout: 10_000 })
    return new Popup(page)
  }
}
