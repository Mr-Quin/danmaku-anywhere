import { Injectable, signal } from '@angular/core'

const BANNER_KEY = 'hide-banner'

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  $showBanner = signal(!localStorage.getItem(BANNER_KEY))

  hideBanner() {
    localStorage.setItem(BANNER_KEY, '1')
    this.$showBanner.set(false)
  }
}
