import type { Page } from '@playwright/test'
import { ConfirmDialog } from './ConfirmDialog'
import { ImportResultDialog } from './ImportResultDialog'
import { MountPage } from './MountPage'
import { ProvidersPage } from './ProvidersPage'
import { SearchPage } from './SearchPage'
import { SeasonDetailsPage } from './SeasonDetailsPage'
import { Toast } from './Toast'
import { UrlImportDialog } from './UrlImportDialog'

export class Popup {
  readonly mount: MountPage
  readonly search: SearchPage
  readonly seasonDetails: SeasonDetailsPage
  readonly providers: ProvidersPage
  readonly toast: Toast
  readonly dialog: ConfirmDialog
  readonly urlImport: UrlImportDialog
  readonly importResult: ImportResultDialog

  private constructor(page: Page) {
    this.mount = new MountPage(page)
    this.search = new SearchPage(page)
    this.seasonDetails = new SeasonDetailsPage(page)
    this.providers = new ProvidersPage(page)
    this.toast = new Toast(page)
    this.dialog = new ConfirmDialog(page)
    this.urlImport = new UrlImportDialog(page)
    this.importResult = new ImportResultDialog(page)
  }

  static async open(
    page: Page,
    extensionId: string,
    hashRoute = '/search',
    opts: { detached?: boolean } = {}
  ): Promise<Popup> {
    // detached=1 makes the popup fill the viewport instead of its fixed 500px
    // box, so a narrow viewport can exercise width-dependent layout.
    const query = opts.detached ? '?detached=1' : ''
    await page.goto(
      `chrome-extension://${extensionId}/pages/popup.html${query}#${hashRoute}`
    )
    await page.locator('#root').waitFor({ state: 'visible' })
    return new Popup(page)
  }
}
