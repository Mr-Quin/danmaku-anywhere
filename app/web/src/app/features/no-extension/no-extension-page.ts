import { Platform } from '@angular/cdk/platform'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faChrome, faFirefoxBrowser } from '@fortawesome/free-brands-svg-icons'
import { Button, ButtonDirective } from 'primeng/button'
import { UAParser } from 'ua-parser-js'
import { isChromeFamily } from 'ua-parser-js/helpers'
import { TrackingService } from '../../core/tracking.service'
import {
  CHROME_STORE_URL,
  FIREFOX_STORE_URL,
  GITHUB_REPO_URL,
} from '../../shared/constants'
import { ExternalLinkDirective } from '../../shared/directives/external-link.directive'

@Component({
  selector: 'da-no-extension',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, Button, ButtonDirective, ExternalLinkDirective],
  template: `
    <div class="flex flex-col justify-center items-center h-full">
      @if (isMobile) {
        <h1 class="text-2xl font-bold mb-4">暂时只支持桌面端使用</h1>
      } @else {
        <h1 class="text-2xl font-bold mb-4">此应用需要Danmaku Anywhere扩展v1.1.0或以上版本</h1>
        <p-button class="hidden"></p-button>
        @if (isChromium) {
          <a pButton target="_blank" [href]="chromeStoreUrl" (click)="onDownloadClick('chrome')">
            安装Chrome扩展
            <fa-icon [icon]="chrome" />
          </a>
        } @else if (isFirefox) {
          <a pButton target="_blank" [href]="firefoxStoreUrl" (click)="onDownloadClick('firefox')">
            安装Firefox扩展
            <fa-icon [icon]="firefox" />
          </a>
        } @else {
          不支持Chromium和Fire以外的浏览器
        }
        <a daExternalLink class="text-gray-500 mt-8" target="_blank" [href]="githubUrl">
          其他安装方式
        </a>
      }
    </div>
  `,
})
export class NoExtensionPage {
  private trackingService = inject(TrackingService)
  private platform = inject(Platform)
  private ua = UAParser(navigator.userAgent)
  protected chrome = faChrome
  protected firefox = faFirefoxBrowser

  protected githubUrl = GITHUB_REPO_URL
  protected chromeStoreUrl = CHROME_STORE_URL
  protected firefoxStoreUrl = FIREFOX_STORE_URL

  protected isChromium = isChromeFamily(this.ua)
  protected isFirefox =
    this.ua.browser.name?.toLowerCase().includes('firefox') ?? false

  protected isMobile = this.platform.IOS || this.platform.ANDROID

  protected onDownloadClick(target: string) {
    this.trackingService.track('clickDownloadExtension', {
      browser: this.ua.browser.name,
      target,
    })
  }
}
