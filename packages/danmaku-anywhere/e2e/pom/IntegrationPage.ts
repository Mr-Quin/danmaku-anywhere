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
}
