import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * An SPA router that dispatches a synthetic, bubbling "pagehide" on a view
 * element (as Jellyfin's does) must not unregister the player frame. After the
 * fake event the page reveals its <video>; asserts the integration still
 * auto-mounts and renders comments instead of failing with no active frame.
 */

const ORIGIN = 'https://da-test.invalid'
const PAGE_URL = `${ORIGIN}/spa/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const COMMENTS = [
  { p: '12,1,16777215,e2e-1', m: 'first' },
  { p: '24,1,16777215,e2e-2', m: 'second' },
]
const SEEK_TIME_S = 15

test('integration auto-mount: survives a synthetic pagehide', async ({
  context,
  page,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })
  const customEpisode = await da.episode.addCustom({
    title: 'DA Integration Test',
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
  await integrationPage.open(PAGE_URL, 'synthetic-pagehide.html')

  await expect
    .poll(async () => (await da.mount.current())?.activeFrameId, {
      timeout: 10_000,
    })
    .toBeDefined()

  await integrationPage.switchView()

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.episodeIds).toEqual([customEpisode.id])

  await integrationPage.playVideo()

  await expect(async () => {
    await integrationPage.setVideoTime(SEEK_TIME_S)
    await expect(integrationPage.commentElements().first()).toBeVisible({
      timeout: 1_000,
    })
  }).toPass({ timeout: 15_000 })
})
