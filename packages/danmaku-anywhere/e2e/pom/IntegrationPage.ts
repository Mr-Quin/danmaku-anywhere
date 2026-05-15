import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Frame, Locator, Page } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITES_ROOT = path.join(__dirname, '..', 'fixtures', 'sites')

export interface OpenOptions {
  // Additional fixture files to serve at same-origin paths (e.g. for
  // iframe-inner.html when the host page references it via /iframe-inner.html).
  // Keys are URL path segments under the host URL's origin, values are
  // fixture file names under e2e/fixtures/sites/.
  extraFixtures?: Record<string, string>
}

// Page object for synthetic pages used to exercise the integration pipeline
// (URL match → policy → media-info → auto-mount → render). Generic — works
// for any fixture under e2e/fixtures/sites/, including top-frame video and
// iframe-hosted video setups.
export class IntegrationPage {
  // Frame containing the <video>. Defaults to the top frame; overridden by
  // useIframeVideo() for iframe scenarios.
  private videoFrame: Frame | null = null
  // Selector passed to useIframeVideo, kept so commentElements() can build a
  // frameLocator off the same selector instead of re-deriving one from the
  // frame URL (which is fragile under query-string / hash changes).
  private iframeSelector: string | null = null

  constructor(private readonly page: Page) {}

  async open(
    url: string,
    fixtureFile: string,
    options: OpenOptions = {}
  ): Promise<void> {
    const html = readFileSync(path.join(SITES_ROOT, fixtureFile), 'utf-8')
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: html,
      })
    })
    // Same-origin sub-resources (e.g. iframe-inner.html). Each entry routes
    // a same-origin path to a static fixture file.
    const origin = new URL(url).origin
    for (const [pathSuffix, fixture] of Object.entries(
      options.extraFixtures ?? {}
    )) {
      const extraUrl = `${origin}${pathSuffix.startsWith('/') ? '' : '/'}${pathSuffix}`
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

  // Switch the video-control methods to operate on the <video> inside the
  // named iframe (located by selector on the host page). Subsequent
  // setVideoTime / playVideo calls dispatch into that iframe's document.
  async useIframeVideo(iframeSelector: string): Promise<void> {
    const handle = await this.page.locator(iframeSelector).elementHandle()
    if (!handle) {
      throw new Error(
        `IntegrationPage.useIframeVideo: iframe '${iframeSelector}' not found`
      )
    }
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

  // Programmatically set currentTime. An empty <video> won't fire seeking /
  // timeupdate events on its own with no media to seek through, so we
  // synthesize them — the renderer's bindVideo plugin listens for exactly
  // these events to advance the danmaku cursor.
  async setVideoTime(seconds: number): Promise<void> {
    await this.target.evaluate((t) => {
      const v = document.querySelector('video') as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.setVideoTime: no <video> element')
      }
      v.currentTime = t
      v.dispatchEvent(new Event('seeking'))
      v.dispatchEvent(new Event('timeupdate'))
    }, seconds)
  }

  // Force the renderer into the "playing" branch. The bare <video> has no
  // src so .play() can't drive playback; we dispatch the events the engine
  // listens for. Idempotent.
  async playVideo(): Promise<void> {
    await this.target.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.playVideo: no <video> element')
      }
      v.dispatchEvent(new Event('play'))
      v.dispatchEvent(new Event('playing'))
    })
  }

  async pauseVideo(): Promise<void> {
    await this.target.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement | null
      if (!v) {
        throw new Error('IntegrationPage.pauseVideo: no <video> element')
      }
      v.dispatchEvent(new Event('pause'))
    })
  }

  // Danmaku comment DOM nodes rendered by the engine. Scoped to the player
  // popover root so we don't accidentally match anything from the host page.
  // In dev builds the shadow root is open, so Playwright's CSS selectors
  // pierce through automatically. For iframe scenarios the renderer mounts
  // inside the iframe's document — use page.frameLocator there.
  commentElements(): Locator {
    if (this.iframeSelector) {
      return this.page
        .frameLocator(this.iframeSelector)
        .locator('#danmaku-anywhere-player .da-danmaku')
    }
    return this.page.locator('#danmaku-anywhere-player .da-danmaku')
  }
}
