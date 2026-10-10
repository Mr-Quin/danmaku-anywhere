import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import {
  FIXTURE_FIRST_TEXT,
  FIXTURE_SEEK_TIME_S,
  seedFixtureIntegration,
} from '../../setup/integration'

/**
 * Auto-mount happy path: URL match → XPath policy → media-info → mount →
 * render at the right timestamp. Two video setups: top-frame and
 * same-origin iframe. Both resolve via LocalMatchingStrategy against a
 * seeded custom episode. No provider network is exercised here.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const IFRAME_URL = `${ORIGIN}/iframe/`
const MOUNT_PATTERN = `${ORIGIN}/*`

test('integration auto-mount: native <video> happy path', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureIntegration(context, da, [
    MOUNT_PATTERN,
  ])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  // 15s = video-discovery observer interval (1s) + React mount + slack.
  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()

  await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)

  // Assert on what the renderer rendered rather than racing a node that
  // despawns as it scrolls.
  await da.danmakuRender.waitForRendered(FIXTURE_FIRST_TEXT)
  // The overlay is the durable user-visible signal; a comment node despawns.
  await expect(integrationPage.danmuContainer()).toBeVisible()
})

test('integration auto-mount: same-origin iframe <video> happy path', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureIntegration(context, da, [
    MOUNT_PATTERN,
  ])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(IFRAME_URL, 'iframe-host.html', {
    extraFixtures: { 'iframe-inner.html': 'iframe-inner.html' },
  })

  // <video> in a child frame: controller (top) extracts media info,
  // player content script (allFrames) inside the iframe mounts the renderer.
  await integrationPage.useIframeVideo('iframe[data-testid="da-iframe"]')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()

  await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)

  // Assert on what the renderer rendered rather than racing a node that
  // despawns as it scrolls.
  await da.danmakuRender.waitForRendered(FIXTURE_FIRST_TEXT)
  // The overlay is the durable user-visible signal; a comment node despawns.
  await expect(integrationPage.danmuContainer()).toBeVisible()
})
