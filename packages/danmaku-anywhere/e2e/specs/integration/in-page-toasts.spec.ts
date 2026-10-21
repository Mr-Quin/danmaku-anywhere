import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import {
  buildFixtureIntegrationPolicy,
  seedFixtureIntegration,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * Automatic mounting keeps one toast per episode. A fast match shows only the
 * result, which names the show, the episode and the comment count; an episode
 * change replaces it in place. A slow match first shows a progress toast that
 * the result then replaces in place. Toasts pile up bottom-left below the
 * floating button and spread out on hover. Asserts toast text, severity,
 * identity, count and position.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_1_MOUNTED =
  /^(Mounted DA Integration Test Episode 1: 3 comments|已装填 DA Integration Test 第1集：3 条弹幕)$/
const EPISODE_2_MOUNTED =
  /^(Mounted DA Integration Test Episode 2: 3 comments|已装填 DA Integration Test 第2集：3 条弹幕)$/
const FINDING =
  /^(Finding danmaku for DA Integration Test Episode 1…|正在为 DA Integration Test 第1集 查找弹幕…)$/
// Not anchored at the end: a DanDanPlay toast also carries its Refresh button.
const MOUNTED_FROM_SOURCE = /^(Mounted .+: \d+ comments|已装填 .+：\d+ 条弹幕)/
const HIDDEN = /^(Danmaku hidden|弹幕已隐藏)/

const DDP_SEARCH_URL = /\/ddp\/api\/v2\/search\/anime/
const DDP_BANGUMI_URL = /\/ddp\/api\/v2\/bangumi\//
const DDP_COMMENT_URL = /\/ddp\/api\/v2\/comment\//
const SLOW_SEARCH_MS = 3_000

function singleSearchResult() {
  const search = loadJsonFixture('ddp-search.json') as { animes: unknown[] }
  return { ...search, animes: search.animes.slice(0, 1) }
}

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
})

test('an episode change replaces the mount toast in place', async ({
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
  const key = await toast.keyOf(toast.all())

  await integrationPage.setEpisodeText('Episode 2')

  await toast.expectSuccess(EPISODE_2_MOUNTED, { timeout: 15_000 })
  expect(await toast.all().count()).toBe(1)
  expect(await toast.keyOf(toast.all())).toBe(key)
})

test('a slow match shows progress that turns into the result in place', async ({
  context,
  page,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      {
        pattern: DDP_SEARCH_URL,
        respond: async (route) => {
          await new Promise((resolve) => setTimeout(resolve, SLOW_SEARCH_MS))
          await route.fulfill({ json: singleSearchResult() })
        },
      },
      {
        pattern: DDP_BANGUMI_URL,
        respond: (route) =>
          route.fulfill({ json: loadJsonFixture('ddp-bangumi.json') }),
      },
      {
        pattern: DDP_COMMENT_URL,
        respond: (route) =>
          route.fulfill({ json: loadJsonFixture('ddp-comments.json') }),
      },
    ],
  })
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const toast = new Toast(page)
  const progress = toast.bySeverity('info').filter({ hasText: FINDING })
  await expect(progress).toBeVisible({ timeout: 10_000 })
  const key = await toast.keyOf(progress)

  await toast.expectSuccess(MOUNTED_FROM_SOURCE, { timeout: 15_000 })
  expect(await toast.all().count()).toBe(1)
  expect(await toast.keyOf(toast.all())).toBe(key)
})

test('the collapsed pile stays below the floating button and spreads out on hover', async ({
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
  await page.keyboard.press('Shift+B')
  await page.keyboard.press('Shift+B')
  await toast.expectVisible(HIDDEN)
  await expect(toast.all()).toHaveCount(3)

  const button = await integrationPage.floatingButton().boundingBox()
  const pile = toast.pile()
  await expect(pile).toHaveAttribute('data-expanded', 'false')
  const collapsed = await pile.boundingBox()
  expect(button).not.toBeNull()
  expect(collapsed).not.toBeNull()
  if (button && collapsed) {
    expect(collapsed.y).toBeGreaterThanOrEqual(button.y + button.height)
    expect(collapsed.x).toBeLessThan(button.x + button.width)
  }

  await toast.all().last().hover()
  await expect(pile).toHaveAttribute('data-expanded', 'true')
  const oldest = toast.all().first()
  const newest = toast.all().last()
  await expect
    .poll(async () => {
      const [a, b] = await Promise.all([
        oldest.boundingBox(),
        newest.boundingBox(),
      ])
      return a && b ? a.y + a.height <= b.y : false
    })
    .toBe(true)

  await integrationPage.movePointerOffVideo()
  await expect(pile).toHaveAttribute('data-expanded', 'false')
})
