import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import { seedFixtureIntegration } from '../../setup/integration'

/**
 * Automatic mounting tells the user once per episode. A page load and an SPA
 * episode change each show a single success toast that names the show, the
 * episode and the comment count, with no progress or unmount toasts around it.
 * The stack sits at the top of the page, clear of the floating button and of
 * a player's bottom control bar. Asserts toast text, severity and position.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_1_MOUNTED =
  /^(Mounted DA Integration Test Episode 1: 3 comments|已装填 DA Integration Test 第1集：3 条弹幕)$/
const EPISODE_2_MOUNTED =
  /^(Mounted DA Integration Test Episode 2: 3 comments|已装填 DA Integration Test 第2集：3 条弹幕)$/

test('a page load shows one toast naming the mounted episode', async ({
  context,
  page,
  da,
}) => {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const toast = new Toast(page)
  await toast.expectSuccess(EPISODE_1_MOUNTED, { timeout: 15_000 })
  expect(await toast.all().count()).toBe(1)

  const box = await toast.all().boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  if (box && viewport) {
    expect(box.y).toBeLessThan(viewport.height / 4)
  }
})

test('an episode change shows only the new mount toast', async ({
  context,
  page,
  da,
}) => {
  await seedFixtureIntegration(context, da, [MOUNT_PATTERN])

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const toast = new Toast(page)
  await toast.expectSuccess(EPISODE_1_MOUNTED, { timeout: 15_000 })
  await expect(toast.all()).toHaveCount(0, { timeout: 10_000 })

  await integrationPage.setEpisodeText('Episode 2')

  await toast.expectSuccess(EPISODE_2_MOUNTED, { timeout: 15_000 })
  expect(await toast.all().count()).toBe(1)
  await expect
    .poll(async () => (await da.mount.current())?.isMounted)
    .toBe(true)
})
