import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import { seedFixtureIntegration } from '../../setup/integration'

/**
 * The in-page controller stays usable on awkward screens. The window fits a
 * short viewport, and opens near the bottom-left corner when there is no
 * floating button to open it from. The floating button hides while an iframe
 * is fullscreen, where it could not take clicks, and comes back on exit.
 * Asserts the window's on-screen box and the button's presence.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const IFRAME_URL = `${ORIGIN}/iframe/`
const MOUNT_PATTERN = `${ORIGIN}/*`

test('the window fits a short viewport', async ({ context, page, da }) => {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN])
  await page.setViewportSize({ width: 1280, height: 580 })

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await expect(integrationPage.floatingButton()).toBeVisible({
    timeout: 10_000,
  })

  await page.keyboard.press('Alt+K')
  const window = integrationPage.controllerWindow()
  await expect(window).toBeVisible()

  const box = await window.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(580)
  }
})

test('without the floating button the window opens near the bottom-left', async ({
  context,
  page,
  da,
}) => {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN], {
    showFloatingButton: false,
  })
  await page.setViewportSize({ width: 1280, height: 900 })

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await da.mount.waitForMount(undefined, 15_000)

  await page.keyboard.press('Alt+K')
  const window = integrationPage.controllerWindow()
  await expect(window).toBeVisible()

  const box = await window.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(16)
    expect(box.y + box.height).toBeGreaterThan(900 - 100)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
  }
})

test('iframe fullscreen hides the floating button', async ({
  context,
  page,
  da,
}) => {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(IFRAME_URL, 'iframe-host.html', {
    extraFixtures: { 'iframe-inner.html': 'iframe-inner.html' },
  })
  await integrationPage.useIframeVideo('iframe[data-testid="da-iframe"]')
  await da.mount.waitForMount(undefined, 15_000)
  await expect(integrationPage.floatingButton()).toBeVisible()

  await integrationPage.enterIframeFullscreen()
  await expect(
    integrationPage.floatingButton({ includeInert: true })
  ).toHaveCount(0)

  await page.evaluate(() => document.exitFullscreen())
  await expect(integrationPage.floatingButton()).toBeVisible()
})
