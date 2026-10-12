import type { BrowserContext, Page } from '@playwright/test'
import {
  type DanmakuOptions,
  defaultDanmakuOptions,
} from '../../../src/common/options/danmakuOptions/constant'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import type { DaClient } from '../../setup/da-client'
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
 * applied to the danmu container (cleared again when the feature is off), and
 * that the mask is sized and offset for a custom danmaku area. Also asserts the
 * failure path: with the debug option on, the hosted anime model (which needs
 * WebGPU, absent in CI) surfaces a visible error toast and a translated info
 * panel row and applies no mask, without breaking danmaku playback. Without the
 * debug option a saved hosted model falls back to People and masks normally.
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

function maskPlacementOf(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el)
    return {
      size:
        style.getPropertyValue('mask-size') ||
        style.getPropertyValue('-webkit-mask-size'),
      position:
        style.getPropertyValue('mask-position') ||
        style.getPropertyValue('-webkit-mask-position'),
    }
  })
}

async function mountWithOcclusion(
  context: BrowserContext,
  page: Page,
  da: DaClient,
  options: {
    debug?: boolean
    infoPanel?: boolean
    danmaku?: Partial<DanmakuOptions>
  } = {}
): Promise<IntegrationPage> {
  await applyProfile(context, da, {
    extensionOptions: {
      matchLocalDanmaku: true,
      debug: options.debug ?? false,
      infoPanel: { enabled: options.infoPanel ?? false },
    },
    rawStorage: [
      {
        area: 'sync',
        key: 'danmakuOptions',
        value: {
          data: {
            ...defaultDanmakuOptions,
            occlusion: true,
            ...options.danmaku,
          },
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

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await routeMedia(page, VIDEO_URL, 'media/sample-motion.webm')
  await integrationPage.open(NATIVE_URL, 'native-video-file.html')
  await da.mount.waitForMount(undefined, 15_000)
  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 15_000,
  })
  return integrationPage
}

test('occlusion: mask applied to danmu container when enabled', async ({
  context,
  page,
  da,
}) => {
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

test('occlusion: no mask when disabled', async ({ context, page, da }) => {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
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

test('occlusion: with debug on, the anime model without WebGPU surfaces a translated error and applies no mask', async ({
  context,
  page,
  da,
}) => {
  const integrationPage = await mountWithOcclusion(context, page, da, {
    debug: true,
    infoPanel: true,
    danmaku: { occlusionModel: 'anime' },
  })

  const toast = new Toast(page)
  await toast.expectError(/WebGPU/i, { timeout: 15_000 })

  await integrationPage.infoPanel().hover()
  const row = integrationPage.infoPanelRowWithSev('occlusion', 'danger')
  await expect(row).toContainText(/WebGPU/)
  await expect(row).not.toContainText('provider init failed')

  expect(await maskImageOf(integrationPage.danmuContainer())).toBe('none')
})

test('occlusion: without debug, a saved hosted model falls back to People', async ({
  context,
  page,
  da,
}) => {
  const integrationPage = await mountWithOcclusion(context, page, da, {
    danmaku: { occlusionModel: 'anime' },
  })

  await expect
    .poll(() => maskImageOf(integrationPage.danmuContainer()), {
      timeout: 5_000,
    })
    .toMatch(/^url\(/)
  await expect(new Toast(page).bySeverity('error')).toHaveCount(0)
})

test('occlusion: the mask lines up with the video under a custom danmaku area', async ({
  context,
  page,
  da,
}) => {
  const integrationPage = await mountWithOcclusion(context, page, da, {
    danmaku: { area: { xStart: 0, xEnd: 100, yStart: 0, yEnd: 50 } },
  })

  await expect
    .poll(() => maskImageOf(integrationPage.danmuContainer()), {
      timeout: 5_000,
    })
    .toMatch(/^url\(/)
  expect(await maskPlacementOf(integrationPage.danmuContainer())).toEqual({
    size: '100% 200%',
    position: '0% 0%',
  })
})

test('occlusion: debug mode shows the mask debug overlay', async ({
  context,
  page,
  da,
}) => {
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
