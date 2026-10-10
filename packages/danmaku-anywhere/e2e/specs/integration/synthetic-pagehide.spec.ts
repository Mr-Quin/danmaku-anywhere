import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import {
  FIXTURE_SEEK_TIME_S,
  seedFixtureIntegration,
} from '../../setup/integration'

/**
 * An SPA router that dispatches a synthetic, bubbling "pagehide" on a view
 * element (as Jellyfin's does) must not unregister the player frame. After the
 * fake event the page reveals its <video>; asserts the integration still
 * auto-mounts and renders comments instead of failing with no active frame.
 */

const ORIGIN = 'https://da-test.invalid'
const PAGE_URL = `${ORIGIN}/spa/`
const MOUNT_PATTERN = `${ORIGIN}/*`

test('integration auto-mount: survives a synthetic pagehide', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureIntegration(context, da, [
    MOUNT_PATTERN,
  ])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(PAGE_URL, 'synthetic-pagehide.html')

  await expect
    .poll(async () => (await da.mount.current())?.activeFrameId, {
      timeout: 10_000,
    })
    .toBeDefined()
  const registeredFrameId = (await da.mount.current())?.activeFrameId

  await integrationPage.switchView()

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.episodeIds).toEqual([episodeId])
  expect(mirror.activeFrameId).toBe(registeredFrameId)

  await integrationPage.playVideo()

  await expect(async () => {
    await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)
    await expect(integrationPage.commentElements().first()).toBeVisible({
      timeout: 1_000,
    })
  }).toPass({ timeout: 15_000 })
})
