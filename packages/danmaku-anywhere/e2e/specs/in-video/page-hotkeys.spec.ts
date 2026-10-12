import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import {
  FIXTURE_FIRST_TEXT,
  FIXTURE_SEEK_TIME_S,
  seedFixtureIntegration,
} from '../../setup/integration'

/**
 * The danmaku shortcuts work with the floating button hidden. Shift+B hides
 * and shows danmaku with a short toast each way, and Shift+U unmounts. While
 * hidden, an episode change still mounts the new episode and its comments stay
 * hidden; showing again does not rerun matching. Asserts toasts, the absence
 * of the floating button, comment visibility and the mount state.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const HIDDEN =
  /^(Danmaku hidden \(Shift\+B to show\)|弹幕已隐藏（按 Shift\+B 显示）)$/
const SHOWN = /^(Danmaku shown|弹幕已显示)$/
const UNMOUNTED = /^(Danmaku Unmounted|弹幕已卸载)$/
const EPISODE_2_MOUNTED = /(Episode 2|第2集)/

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

  await page.keyboard.press('Shift+B')
  await toast.expectVisible(HIDDEN)

  await page.keyboard.press('Shift+B')
  await toast.expectVisible(SHOWN)

  await page.keyboard.press('Shift+U')
  await toast.expectVisible(UNMOUNTED)
  await expect
    .poll(async () => (await da.mount.current())?.isMounted)
    .toBe(false)
})

test('hidden danmaku follow an episode change and stay hidden', async ({
  context,
  page,
  da,
}) => {
  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await openWithoutButton(integrationPage, context, da)

  const toast = new Toast(page)
  await page.keyboard.press('Shift+B')
  await toast.expectVisible(HIDDEN)

  await integrationPage.setEpisodeText('Episode 2')
  await toast.expectSuccess(EPISODE_2_MOUNTED, { timeout: 15_000 })

  await integrationPage.playVideo()
  await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)
  await da.danmakuRender.waitForRendered(FIXTURE_FIRST_TEXT)
  // A comment can scroll off before the check runs; seeking again re-emits it.
  await expect(async () => {
    await integrationPage.setVideoTime(FIXTURE_SEEK_TIME_S)
    await expect(integrationPage.commentElements().first()).toBeAttached({
      timeout: 1_000,
    })
    const visibilities = await integrationPage.commentVisibilities()
    expect(visibilities.length).toBeGreaterThan(0)
    expect(visibilities).toEqual(visibilities.map(() => 'hidden'))
  }).toPass({ timeout: 10_000 })

  await expect(toast.all()).toHaveCount(0, { timeout: 10_000 })
  await page.keyboard.press('Shift+B')
  await toast.expectVisible(SHOWN)
  // Success is the absence of a rematch, so there is no event to wait for.
  await page.waitForTimeout(2_000)
  await expect(toast.bySeverity('success')).toHaveCount(0)
})
