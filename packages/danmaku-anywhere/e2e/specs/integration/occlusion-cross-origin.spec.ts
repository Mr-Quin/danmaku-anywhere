import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * Occlusion cross-origin recovery, end to end over real network (the
 * route-fulfilled `.invalid` origins cannot, since DNR only sees real
 * responses). The page is served from localhost:8889 and the video from
 * 127.0.0.1:8889 (a distinct origin), so the capture canvas is genuinely
 * tainted. Asserts the original is tainted yet occlusion still applies a mask,
 * which is only possible if the extension's DNR rule + crossorigin clone
 * un-tainted it; also covers the player swapping to another cross-origin src.
 */

const PAGE_ORIGIN = 'http://localhost:8889'
const MEDIA_ORIGIN = 'http://127.0.0.1:8889'
const PAGE_URL = `${PAGE_ORIGIN}/sites/cross-origin-video.html`
const VIDEO_1 = `${MEDIA_ORIGIN}/media/sample-motion.webm`
const VIDEO_2 = `${MEDIA_ORIGIN}/media/person-akiyo.webm`
const MOUNT_PATTERN = `${PAGE_ORIGIN}/*`

const EPISODE_TITLE = 'DA Harness Native Video'
const COMMENTS = [
  { p: '1,1,16777215,e2e-1', m: 'first' },
  { p: '2,1,16777215,e2e-2', m: 'second' },
  { p: '3,1,16777215,e2e-3', m: 'third' },
]

// Real harness server (playwright webServer): the page origin and the
// cross-origin video origin, both needed live so the canvas genuinely taints
// and the extension's DNR rule can un-taint a real response.
test.use({ allowedNetworkOrigins: ['localhost:8889', '127.0.0.1:8889'] })

// Helpers below probe the harness page directly (taint state, mask, src swap).
// They are specific to this cross-origin harness fixture, not the shared
// IntegrationPage POM, so they live here rather than as POM methods.
function maskImageOf(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el)
    return (
      style.getPropertyValue('-webkit-mask-image') ||
      style.getPropertyValue('mask-image')
    )
  })
}

function videoTaintState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(
      'video[data-testid="da-video"]'
    )
    if (!v || v.readyState < 2) {
      return 'notready'
    }
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 2
    const ctx = c.getContext('2d')
    if (!ctx) {
      return 'noctx'
    }
    ctx.drawImage(v, 0, 0, 2, 2)
    try {
      ctx.getImageData(0, 0, 1, 1)
      return 'clean'
    } catch (e) {
      return e instanceof DOMException ? e.name : 'error'
    }
  })
}

function setVideoSrc(page: import('@playwright/test').Page, src: string) {
  return page.evaluate((url) => {
    const v = document.querySelector<HTMLVideoElement>(
      'video[data-testid="da-video"]'
    )
    if (v) {
      v.src = url
      v.load()
    }
  }, src)
}

async function seedOcclusionMount(context: Parameters<typeof getDaClient>[0]) {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
    rawStorage: [
      {
        area: 'sync',
        key: 'danmakuOptions',
        value: {
          data: { ...defaultDanmakuOptions, occlusion: true },
          version: 10,
        },
      },
    ],
  })
  await da.episode.addCustom({
    provider: DanmakuSourceType.MacCMS,
    title: EPISODE_TITLE,
    comments: COMMENTS,
    commentCount: COMMENTS.length,
    schemaVersion: 4,
  })
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    name: 'da-e2e',
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)
  return da
}

test('occlusion recovers a cross-origin tainted video via the DNR clone', async ({
  context,
  page,
}) => {
  const da = await seedOcclusionMount(context)
  const integrationPage = new IntegrationPage(page)

  await page.bringToFront()
  await page.goto(PAGE_URL)
  await setVideoSrc(page, VIDEO_1)

  await expect.poll(() => videoTaintState(page)).toBe('SecurityError')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 15_000,
  })

  await expect
    .poll(() => maskImageOf(integrationPage.danmuContainer()))
    .toMatch(/^url\(/)
})

test('occlusion re-recovers when the player swaps to another cross-origin src', async ({
  context,
  page,
}) => {
  const da = await seedOcclusionMount(context)
  const integrationPage = new IntegrationPage(page)

  await page.bringToFront()
  await page.goto(PAGE_URL)
  await setVideoSrc(page, VIDEO_1)
  await da.mount.waitForMount(undefined, 15_000)
  await expect
    .poll(() => maskImageOf(integrationPage.danmuContainer()))
    .toMatch(/^url\(/)

  await setVideoSrc(page, VIDEO_2)
  await expect.poll(() => videoTaintState(page)).toBe('SecurityError')
  await expect
    .poll(() => maskImageOf(integrationPage.danmuContainer()))
    .toMatch(/^url\(/)
})
