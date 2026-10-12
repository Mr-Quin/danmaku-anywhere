import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Frame, Locator, Page } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITES_ROOT = path.join(__dirname, '..', 'fixtures', 'sites')

export interface OpenOptions {
  // Same-origin sub-resources to serve, keyed by path under the host URL's
  // origin (e.g. 'iframe-inner.html'), valued by fixture filename.
  extraFixtures?: Record<string, string>
}

export class IntegrationPage {
  private videoFrame: Frame | null = null
  private iframeSelector: string | null = null

  constructor(private readonly page: Page) {}

  async open(
    url: string,
    fixtureFile: string,
    options: OpenOptions = {}
  ): Promise<void> {
    this.videoFrame = null
    this.iframeSelector = null

    const html = readFileSync(path.join(SITES_ROOT, fixtureFile), 'utf-8')
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: html,
      })
    })
    const origin = new URL(url).origin
    for (const [pathSuffix, fixture] of Object.entries(
      options.extraFixtures ?? {}
    )) {
      const extraUrl = new URL(pathSuffix, origin).href
      const body = readFileSync(path.join(SITES_ROOT, fixture), 'utf-8')
      await this.page.route(extraUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body,
        })
      })
    }
    await this.page.goto(url)
  }

  // After this, video methods target the <video> inside the named iframe.
  async useIframeVideo(iframeSelector: string): Promise<void> {
    const handle = await this.page.waitForSelector(iframeSelector)
    const frame = await handle.contentFrame()
    if (!frame) {
      throw new Error(
        `IntegrationPage.useIframeVideo: iframe '${iframeSelector}' has no contentFrame`
      )
    }
    this.videoFrame = frame
    this.iframeSelector = iframeSelector
  }

  // Fixture pages that model an SPA expose window.switchView().
  async switchView(): Promise<void> {
    await this.page.evaluate(() => {
      const spa = window as unknown as { switchView?: () => void }
      if (!spa.switchView) {
        throw new Error(
          'IntegrationPage.switchView: fixture has no switchView()'
        )
      }
      spa.switchView()
    })
  }

  // The XPath integration watches this node's text, so editing it plays the
  // part of an SPA moving to another episode.
  async setEpisodeText(text: string): Promise<void> {
    await this.page.evaluate((value) => {
      const episode = document.querySelector('[data-testid="da-episode"]')
      if (!episode) {
        throw new Error('IntegrationPage.setEpisodeText: no episode node')
      }
      episode.textContent = value
    }, text)
  }

  // Element fullscreen needs a user gesture, so this clicks a page button
  // that requests it rather than calling requestFullscreen from evaluate.
  async enterIframeFullscreen(): Promise<void> {
    if (!this.iframeSelector) {
      throw new Error('IntegrationPage.enterIframeFullscreen: no iframe in use')
    }
    await this.page.evaluate((selector) => {
      const button = document.createElement('button')
      button.textContent = 'fullscreen iframe'
      button.dataset.testid = 'da-fullscreen-iframe'
      button.style.cssText = 'position:fixed;top:8px;right:8px;z-index:1'
      button.addEventListener('click', () => {
        void document.querySelector(selector)?.requestFullscreen()
      })
      document.body.appendChild(button)
    }, this.iframeSelector)
    await this.page.getByTestId('da-fullscreen-iframe').click()
    await this.page.waitForFunction(
      () => document.fullscreenElement?.nodeName === 'IFRAME'
    )
  }

  floatingButton(): Locator {
    return this.page.getByRole('button', {
      name: /^(Open Danmaku Anywhere|打开 Danmaku Anywhere)$/,
    })
  }

  controllerWindow(): Locator {
    return this.page.getByTestId('controller-window')
  }

  private get target(): Page | Frame {
    return this.videoFrame ?? this.page
  }

  // A bare <video> won't fire seek events on its own; synthesize them.
  async setVideoTime(seconds: number): Promise<void> {
    await this.forceVisible()
    await this.target.evaluate((t) => {
      const v = document.querySelector(
        'video[data-testid="da-video"]'
      ) as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.setVideoTime: no <video> element')
      }
      v.currentTime = t
      v.dispatchEvent(new Event('seeking'))
      v.dispatchEvent(new Event('timeupdate'))
    }, seconds)
  }

  // .play() is a no-op on a src-less <video>; synthesize the events directly.
  async playVideo(): Promise<void> {
    await this.forceVisible()
    await this.target.evaluate(() => {
      const v = document.querySelector(
        'video[data-testid="da-video"]'
      ) as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.playVideo: no <video> element')
      }
      v.dispatchEvent(new Event('play'))
      v.dispatchEvent(new Event('playing'))
    })
  }

  // danmaku-engine gates emit on `documentVisible`; headless CI can flip it
  // false via a stray visibilitychange. Pin true before driving the video.
  private async forceVisible(): Promise<void> {
    await this.target.evaluate(() => {
      try {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'visible',
        })
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => false,
        })
      } catch {
        // Getter already pinned by an earlier call.
      }
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  // Pointer activity over the video is what wakes the in-player overlays. A
  // corner is used because the info panel may cover the video's center.
  async movePointerOverVideo(): Promise<void> {
    const selector = 'video[data-testid="da-video"]'
    const video = this.iframeSelector
      ? this.page.frameLocator(this.iframeSelector).locator(selector)
      : this.page.locator(selector)
    const box = await video.boundingBox()
    if (!box) {
      throw new Error(
        'IntegrationPage.movePointerOverVideo: video not laid out'
      )
    }
    await this.page.mouse.move(box.x + box.width - 4, box.y + box.height - 4)
  }

  async movePointerOffVideo(): Promise<void> {
    await this.page.mouse.move(0, 0)
  }

  async pauseVideo(): Promise<void> {
    await this.target.evaluate(() => {
      const v = document.querySelector(
        'video[data-testid="da-video"]'
      ) as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.pauseVideo: no <video> element')
      }
      v.dispatchEvent(new Event('pause'))
    })
  }

  // Rendered danmaku nodes inside the player's (open) shadow root. For
  // iframe scenarios the renderer mounts in the iframe's document.
  commentElements(): Locator {
    if (this.iframeSelector) {
      return this.page
        .frameLocator(this.iframeSelector)
        .locator('#danmaku-anywhere-player .da-danmaku')
    }
    return this.page.locator('#danmaku-anywhere-player .da-danmaku')
  }

  // The danmu library's container element, where the occlusion mask-image is
  // applied. Lives in the iframe's document for iframe scenarios.
  danmuContainer(): Locator {
    const selector = '#danmaku-anywhere-player [data-danmu-container]'
    if (this.iframeSelector) {
      return this.page.frameLocator(this.iframeSelector).locator(selector)
    }
    return this.page.locator(selector)
  }

  private inPlayer(selector: string): Locator {
    const full = `#danmaku-anywhere-player ${selector}`
    if (this.iframeSelector) {
      return this.page.frameLocator(this.iframeSelector).locator(full)
    }
    return this.page.locator(full)
  }

  // The in-video info panel and its parts, inside the player shadow root.
  infoPanel(): Locator {
    return this.inPlayer('.da-ip')
  }

  infoPanelHeadline(): Locator {
    return this.inPlayer('.da-ip-headline')
  }

  infoPanelCount(): Locator {
    return this.inPlayer('.da-ip-count-num')
  }

  // One status row per source; severity is carried on the row, not the panel.
  infoPanelRow(source: 'pipeline' | 'occlusion'): Locator {
    return this.inPlayer(`[data-da-ip-row][data-source="${source}"]`)
  }

  infoPanelRowWithSev(
    source: 'pipeline' | 'occlusion',
    sev: 'neutral' | 'info' | 'success' | 'danger'
  ): Locator {
    return this.inPlayer(
      `[data-da-ip-row][data-source="${source}"][data-sev="${sev}"]`
    )
  }

  infoPanelSourceChip(): Locator {
    return this.infoPanelRow('pipeline').locator('[data-da-ip-source]')
  }

  // The title shown in the collapsed glance (before hover).
  infoPanelGlanceTitle(): Locator {
    return this.infoPanelRow('pipeline').locator('.da-ip-glance-title')
  }

  infoPanelCollapseButton(): Locator {
    return this.inPlayer('.da-ip-collapse')
  }

  // The left-edge tab left behind once the panel is docked.
  infoPanelTab(): Locator {
    return this.inPlayer('.da-ip-tab')
  }
}
