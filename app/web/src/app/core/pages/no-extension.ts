import { ChangeDetectionStrategy, Component } from '@angular/core'
import { FaIconComponent } from '@fortawesome/angular-fontawesome'
import { faChrome, faFirefoxBrowser } from '@fortawesome/free-brands-svg-icons'
import { Button } from 'primeng/button'
import { UAParser } from 'ua-parser-js'
import { isChromeFamily } from 'ua-parser-js/helpers'
import {
  CHROME_STORE_URL,
  FIREFOX_STORE_URL,
  GITHUB_REPO_URL,
} from '../../shared/constants'

@Component({
  selector: 'da-no-extension',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, Button],
  template: `
    <div class="flex flex-col justify-center items-center h-full">
      <h1 class="text-2xl font-bold mb-4">此应用需要Danmaku Anywhere扩展v1.0.4或以上版本</h1>
      <p-button class="hidden"></p-button>
      @if (isChromium) {
        <a class="p-button p-button-primary gap-1" target="_blank" [href]="chromeStoreUrl">
          安装Chrome扩展
          <fa-icon [icon]="chrome" />
        </a>
      } @else if (isFirefox) {
        <a class="p-button p-button-primary gap-1" target="_blank" [href]="firefoxStoreUrl">
          安装Firefox扩展
          <fa-icon [icon]="firefox" />
        </a>
      } @else {
        不支持Chromium和Fire以外的浏览器
      }
      <a class="text-gray-500 underline mt-8" target="_blank" [href]="githubUrl">
        其他安装方式
      </a>
    </div>
  `,
})
export class NoExtension {
  private ua = UAParser(navigator.userAgent)
  protected chrome = faChrome
  protected firefox = faFirefoxBrowser

  protected githubUrl = GITHUB_REPO_URL
  protected chromeStoreUrl = CHROME_STORE_URL
  protected firefoxStoreUrl = FIREFOX_STORE_URL

  protected isChromium = isChromeFamily(this.ua)
  protected isFirefox =
    this.ua.browser.name?.toLowerCase().includes('firefox') ?? false
}
