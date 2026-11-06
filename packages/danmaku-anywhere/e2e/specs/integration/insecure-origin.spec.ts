import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import {
  FIXTURE_FIRST_TEXT,
  FIXTURE_SEEK_TIME_S,
  seedFixtureIntegration,
} from '../../setup/integration'

/**
 * A plain-http page is not a secure context, so browser APIs gated on one
 * (crypto.randomUUID, navigator.locks, ...) are missing there. The other
 * integration specs run on https, so this one opens the iframe host over
 * http and asserts the floating button appears and danmaku still mount and
 * render in the iframe's video.
 */

const ORIGIN = 'http://da-insecure.invalid'
const IFRAME_URL = `${ORIGIN}/iframe/`
const MOUNT_PATTERN = `${ORIGIN}/*`

test('controller and player work on an insecure (http) origin', async ({
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
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false)

  await expect(integrationPage.floatingButton()).toBeVisible({
    timeout: 10_000,
  })

  await integrationPage.useIframeVideo('iframe[data-testid="da-iframe"]')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()
  await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)

  await da.danmakuRender.waitForRendered(FIXTURE_FIRST_TEXT)
  await expect(integrationPage.danmuContainer()).toBeVisible()
})
