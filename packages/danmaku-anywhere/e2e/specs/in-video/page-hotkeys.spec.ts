import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import { seedFixtureIntegration } from '../../setup/integration'

/**
 * The danmaku shortcuts work with the floating button hidden: Shift+U still
 * unmounts. Asserts the absence of the floating button, the unmount toast and
 * the mount state.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const UNMOUNTED = /^(Danmaku Unmounted|弹幕已卸载)$/

async function openWithoutButton(
  integrationPage: IntegrationPage,
  context: Parameters<typeof seedFixtureIntegration>[0],
  da: Parameters<typeof seedFixtureIntegration>[1]
) {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN], {
    showFloatingButton: false,
  })
  await integrationPage.open(NATIVE_URL, 'native-video.html')
  await da.mount.waitForMount(undefined, 15_000)
}

test('shortcuts work with the floating button hidden', async ({
  context,
  page,
  da,
}) => {
  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await openWithoutButton(integrationPage, context, da)
  await expect(integrationPage.floatingButton()).toHaveCount(0)

  const toast = new Toast(page)

  await page.keyboard.press('Shift+U')
  await toast.expectVisible(UNMOUNTED)
  await expect
    .poll(async () => (await da.mount.current())?.isMounted)
    .toBe(false)
})
