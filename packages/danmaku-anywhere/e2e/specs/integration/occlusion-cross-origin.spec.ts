import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * Occlusion cross-origin behavior over real network (route-fulfilled .invalid
 * origins can't exercise DNR). Page on localhost:8889, video on 127.0.0.1:8889,
 * so the canvas genuinely taints. Asserts the recovery path (tainted original +
 * DNR clone yields a mask), the src-swap re-recovery, and the graceful-failure
 * path (a clone the DNR rule cannot rescue surfaces the taint status, leaves
 * playback intact, and applies no mask).
 */

const PAGE_ORIGIN = 'http://localhost:8889'
const MEDIA_ORIGIN = 'http://127.0.0.1:8889'
const PAGE_URL = `${PAGE_ORIGIN}/sites/cross-origin-video.html`
const VIDEO_1 = `${MEDIA_ORIGIN}/media/sample-motion.webm`
const VIDEO_2 = `${MEDIA_ORIGIN}/media/person-akiyo.webm`
// Served so the crossorigin clone's CORS request is rejected (DNR can't rescue
// it) while the plain <video> still plays and taints.
const VIDEO_UNRECOVERABLE = `${MEDIA_ORIGIN}/cors-fail/media/sample-motion.webm`
const MOUNT_PATTERN = `${PAGE_ORIGIN}/*`

const EPISODE_TITLE = 'DA Harness Native Video'
const COMMENTS = [
  { p: '1,1,16777215,e2e-1', m: 'first' },
  { p: '2,1,16777215,e2e-2', m: 'second' },
  { p: '3,1,16777215,e2e-3', m: 'third' },
]

// Both real origins (page + cross-origin video) must hit the network so the
// DNR taint/recovery path is exercised.
test.use({ allowedNetworkOrigins: ['localhost:8889', '127.0.0.1:8889'] })

// Harness-fixture-specific probes (taint, mask, src swap); intentionally not
// IntegrationPage POM methods.
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

function videoCurrentTime(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>(
      'video[data-testid="da-video"]'
    )
    return v?.currentTime ?? 0
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

test.describe('unrecoverable cross-origin source', () => {
  // The clone's CORS fetch to this source is rejected by design.
  test.use({ expectedConsoleErrors: [/cors-fail\/media/] })

  test('occlusion degrades safely when the tainted source cannot be recovered', async ({
    context,
    page,
  }) => {
    const da = await seedOcclusionMount(context)
    const integrationPage = new IntegrationPage(page)
    const toast = new Toast(page)

    await page.bringToFront()
    await page.goto(PAGE_URL)
    await setVideoSrc(page, VIDEO_UNRECOVERABLE)

    await expect.poll(() => videoTaintState(page)).toBe('SecurityError')

    const mirror = await da.mount.waitForMount(undefined, 15_000)
    expect(mirror.isMounted).toBe(true)
    await expect(integrationPage.commentElements().first()).toBeVisible({
      timeout: 15_000,
    })

    await toast.expectError(/cross-origin or DRM|跨域或 DRM/, {
      timeout: 15_000,
    })
    const playheadBefore = await videoCurrentTime(page)
    await expect
      .poll(() => videoCurrentTime(page))
      .toBeGreaterThan(playheadBefore)
    await expect(maskImageOf(integrationPage.danmuContainer())).resolves.toBe(
      'none'
    )
  })
})
