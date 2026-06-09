import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { IntegrationPage } from '../../pom/IntegrationPage'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * Auto-mount happy path: URL match → XPath policy → media-info → mount →
 * render at the right timestamp. Two video setups: top-frame and
 * same-origin iframe. Both resolve via LocalMatchingStrategy against a
 * seeded custom episode — no provider network is exercised here.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const IFRAME_URL = `${ORIGIN}/iframe/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_TITLE = 'DA Integration Test'
// Seeking past SEEK_TIME_S lands the cursor on at least one comment.
const COMMENTS = [
  { p: '12,1,16777215,e2e-1', m: 'first' },
  { p: '24,1,16777215,e2e-2', m: 'second' },
  { p: '36,1,16777215,e2e-3', m: 'third' },
]
const SEEK_TIME_S = 15

async function seedFixtureProfile(
  context: import('@playwright/test').BrowserContext,
  da: DaClient
): Promise<{ episodeId: number }> {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })

  // Title matches what the policy extracts from the fixture; LocalMatching
  // resolves it via fuzzy title fallback (no naming rules needed).
  const customEpisode = await da.episode.addCustom({
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

  // Content-script registration is async; wait or the controller never loads.
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  return { episodeId: customEpisode.id }
}

test('integration auto-mount: native <video> happy path', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureProfile(context, da)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  // 15s = video-discovery observer interval (1s) + React mount + slack.
  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()

  await expect(async () => {
    await integrationPage.setVideoTime(SEEK_TIME_S)
    await expect(integrationPage.commentElements().first()).toBeVisible({
      timeout: 1_000,
    })
  }).toPass({ timeout: 15_000 })
})

test('integration auto-mount: same-origin iframe <video> happy path', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureProfile(context, da)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(IFRAME_URL, 'iframe-host.html', {
    extraFixtures: { 'iframe-inner.html': 'iframe-inner.html' },
  })

  // <video> in a child frame — controller (top) extracts media info,
  // player content script (allFrames) inside the iframe mounts the renderer.
  await integrationPage.useIframeVideo('iframe[data-testid="da-iframe"]')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()

  await expect(async () => {
    await integrationPage.setVideoTime(SEEK_TIME_S)
    await expect(integrationPage.commentElements().first()).toBeVisible({
      timeout: 1_000,
    })
  }).toPass({ timeout: 15_000 })
})
