import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { defaultDanmakuOptions } from '../../../src/common/options/danmakuOptions/constant'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { routeMedia } from '../../setup/media-route'
import { applyProfile } from '../../setup/profile'

/**
 * Occlusion happy path: with occlusion on, a real (local) playing
 * video drives the capture loop, the e2e MockMaskProvider yields a deterministic
 * mask, and the danmu container gets a mask-image applied while danmaku render.
 * Asserts the user-visible signals: danmaku present AND the occlusion mask is
 * applied to the danmu container (cleared again when the feature is off).
 * Also asserts the failure path: selecting the anime model (which needs WebGPU,
 * absent in CI) surfaces a visible error toast and applies no mask, without
 * breaking danmaku playback.
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
    .poll(() => maskImageOf(integrationPage.danmuContainer()), {
      timeout: 5_000,
    })
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

  expect(await maskImageOf(integrationPage.danmuContainer())).toBe('none')
})

test('occlusion: anime model without WebGPU surfaces an error and applies no mask', async ({
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
          data: {
            ...defaultDanmakuOptions,
            occlusion: true,
            occlusionModel: 'anime',
          },
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

  await da.mount.waitForMount(undefined, 15_000)

  // Playback survives the occlusion failure: danmaku still render.
  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 15_000,
  })

  // The failure is visible, not silent.
  const toast = new Toast(page)
  await toast.expectError(/WebGPU/i, { timeout: 15_000 })

  // No mask is applied since the anime provider never initialized.
  expect(await maskImageOf(integrationPage.danmuContainer())).toBe('none')
})

test('occlusion: debug mode shows the mask debug overlay', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true, debug: true },
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

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await routeMedia(page, VIDEO_URL, 'media/sample-motion.webm')
  await integrationPage.open(NATIVE_URL, 'native-video-file.html')

  await da.mount.waitForMount(undefined, 15_000)

  await expect(page.getByText(/occlusion .*fps/)).toBeVisible({
    timeout: 15_000,
  })
})
