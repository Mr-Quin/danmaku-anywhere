import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { Button } from 'primeng/button'
import { ClarityService } from '../../core/clarity.service'

const COOKIE_CONSENT_KEY = 'cookie-consent'

@Component({
  selector: 'da-cookie-consent-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    @if ($showConsent()) {
      <div class="fixed bottom-0 left-0 right-0 bg-primary p-4 z-50">
        <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-sm text-surface-700">
            <p>
              本站使用 Cookie 来改善用户体验。
            </p>
          </div>
          <div class="flex gap-2">
            <p-button
              (click)="decline()">
              拒绝
            </p-button>
            <p-button severity="secondary"
                      (click)="accept()">
              同意
            </p-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CookieConsentFooter {
  private clarityService = inject(ClarityService)

  $showConsent = signal(this.shouldShowConsent())

  private shouldShowConsent(): boolean {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    return consent === null
  }

  accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, '1')
    this.$showConsent.set(false)
    this.clarityService.cookieConsent(true)
  }

  decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, '0')
    this.$showConsent.set(false)
    this.clarityService.cookieConsent(false)
  }
}
