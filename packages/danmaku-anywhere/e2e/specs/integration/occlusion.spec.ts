import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { routeMedia } from '../../setup/media-route'
import { applyProfile } from '../../setup/profile'

/**
 * Occlusion happy path: with occludeBehindPeople on, a real (local) playing
 * video drives the capture loop, the e2e MockMaskProvider yields a deterministic
 * mask, and the danmu container gets a mask-image applied while danmaku render.
 * Asserts the user-visible signals: danmaku present AND the occlusion mask is
 * applied to the danmu container (cleared again when the feature is off).
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const VIDEO_URL = `${ORIGIN}/media/sample-motion.webm`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_TITLE = 'DA Harness Native Video'
const COMMENTS = [
  { p: '1,1,16777215,e2e-1', m: 'first' },
  { p: '2,1,16777215,e2e-2', m: 'second' },
  { p: '3,1,16777215,e2e-3', m: 'third' },
]

const danmuContainer = (page: import('@playwright/test').Page) =>
  page.locator('#danmaku-anywhere-player [data-danmu-container]')

function maskImageOf(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el)
    return (
      style.getPropertyValue('-webkit-mask-image') ||
      style.getPropertyValue('mask-image')
    )
  })
}

test('occlusion: mask applied to danmu container when enabled', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
    rawStorage: [
      {
        area: 'sync',
        key: 'danmakuOptions',
        value: {
          data: { ...defaultDanmakuOptions, occludeBehindPeople: true },
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

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await routeMedia(page, VIDEO_URL, 'media/sample-motion.webm')
  await integrationPage.open(NATIVE_URL, 'native-video-file.html')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)

  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 15_000,
  })

  await expect
    .poll(() => maskImageOf(danmuContainer(page)), { timeout: 15_000 })
    .toMatch(/^url\(/)
})

test('occlusion: no mask when disabled', async ({ context, page }) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
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

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await routeMedia(page, VIDEO_URL, 'media/sample-motion.webm')
  await integrationPage.open(NATIVE_URL, 'native-video-file.html')

  await da.mount.waitForMount(undefined, 15_000)
  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 15_000,
  })

  expect(await maskImageOf(danmuContainer(page))).toBe('none')
})
