import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { BrowserContext } from '@playwright/test'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * The in-video info panel shows only what is true: the mounted episode, on the
 * video that holds it. A page whose title is never found, a search that finds
 * nothing, an unmount with the hotkey, and a second video on the page without
 * danmaku all leave no panel. The no-match toast names the show instead of the
 * matcher's internal cause. Asserts panel DOM and toast text.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const TWO_VIDEOS_URL = `${ORIGIN}/two-videos/`
const MOUNT_PATTERN = `${ORIGIN}/*`
const EPISODE_TITLE = 'DA Integration Test'

async function seed(
  context: BrowserContext,
  da: DaClient,
  options: { withEpisode: boolean; titleFound: boolean }
) {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true, infoPanel: { enabled: true } },
  })
  if (options.withEpisode) {
    await da.episode.addCustom({
      provider: DanmakuSourceType.MacCMS,
      title: EPISODE_TITLE,
      comments: [{ p: '12,1,16777215,e2e-1', m: 'first' }],
      commentCount: 1,
      schemaVersion: 4,
    })
  }
  const policy = buildFixtureIntegrationPolicy()
  if (!options.titleFound) {
    policy.title.selector = [
      { value: '//*[@data-testid="da-missing-title"]', quick: true },
    ]
  }
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    name: 'da-e2e',
    policy,
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)
}

test('no panel while the page title is never found', async ({
  context,
  page,
  da,
}) => {
  await seed(context, da, { withEpisode: true, titleFound: false })

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await integrationPage.playVideo()

  await expect
    .poll(async () => (await da.mount.current())?.activeFrameId, {
      timeout: 10_000,
    })
    .toBe(0)
  // Success here is the absence of the panel, so there is no event to wait
  // for. The player pulls the panel state as soon as it starts; this leaves
  // that reply ample time to have rendered anything.
  await page.waitForTimeout(2_000)

  await expect(integrationPage.infoPanel()).toHaveCount(0)
})

test('a search that finds nothing shows a readable toast and no panel', async ({
  context,
  page,
  da,
}) => {
  await seed(context, da, { withEpisode: false, titleFound: true })

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await integrationPage.playVideo()

  const toast = new Toast(page)
  await toast.expectError(
    /No episode found for DA Integration Test|未找到匹配的剧集：DA Integration Test/,
    { timeout: 15_000 }
  )
  await expect(toast.all().filter({ hasText: 'All strategies' })).toHaveCount(0)
  await expect(integrationPage.infoPanel()).toHaveCount(0)
})

test('unmounting with the hotkey removes the panel', async ({
  context,
  page,
  da,
}) => {
  await seed(context, da, { withEpisode: true, titleFound: true })

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await da.mount.waitForMount(undefined, 15_000)
  await integrationPage.playVideo()
  await expect(integrationPage.infoPanelRow('pipeline')).toBeVisible({
    timeout: 5_000,
  })

  await page.keyboard.press('Shift+U')

  await expect
    .poll(async () => (await da.mount.current())?.isMounted)
    .toBe(false)
  await expect(integrationPage.infoPanel()).toHaveCount(0)
})

test('a second video without danmaku shows no panel', async ({
  context,
  page,
  da,
}) => {
  await seed(context, da, { withEpisode: true, titleFound: true })

  const iframeVideo = new IntegrationPage(page)
  await page.bringToFront()
  await iframeVideo.open(TWO_VIDEOS_URL, 'two-videos.html', {
    extraFixtures: { 'iframe-inner.html': 'iframe-inner.html' },
  })
  await iframeVideo.useIframeVideo('iframe[data-testid="da-iframe"]')
  // Not opened: it only reads the top frame, where the smaller video lives.
  const topVideo = new IntegrationPage(page)

  await da.mount.waitForMount(undefined, 15_000)
  await expect
    .poll(async () => (await da.mount.current())?.activeFrameId, {
      timeout: 10_000,
    })
    .not.toBe(0)
  await iframeVideo.playVideo()

  await expect(iframeVideo.infoPanelRow('pipeline')).toBeVisible({
    timeout: 5_000,
  })
  await expect(topVideo.infoPanel()).toHaveCount(0)
})
