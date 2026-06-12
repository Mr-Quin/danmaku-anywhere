import { IntegrationPage } from '../../pom/IntegrationPage'
import type { DaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * A seeded batch carrying one comment with an unknown mode renders its valid
 * comments and silently drops the malformed one. Guards the parser throwing on
 * an unrecognized mode, which would break rendering of the whole batch. The
 * console-error baseline asserts no error surfaces from the dropped comment.
 * Also verifies that mode-2 (an rtl scrolling variant) is normalized and rendered
 * rather than dropped.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_TITLE = 'DA Integration Test'
const VALID_TEXT = 'valid-comment'
const INVALID_TEXT = 'unknown-mode-comment'
const MODE_2_TEXT = 'mode-2-comment'
// All three sit at the same timestamp, so a dropped-vs-rendered comparison is fair.
const COMMENTS = [
  { p: '12,99,16777215,bad', m: INVALID_TEXT },
  { p: '12,1,16777215,e2e-1', m: VALID_TEXT },
  { p: '12,2,16777215,e2e-2', m: MODE_2_TEXT },
]
const SEEK_TIME_S = 15

async function seedFixtureProfile(
  context: import('@playwright/test').BrowserContext,
  da: DaClient
): Promise<{ episodeId: number }> {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })

  const customEpisode = await da.episode.addCustom({
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

  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  return { episodeId: customEpisode.id }
}

test('unknown comment mode is dropped without breaking the batch', async ({
  context,
  page,
  da,
}) => {
  const { episodeId } = await seedFixtureProfile(context, da)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()

  await expect(async () => {
    await integrationPage.setVideoTime(SEEK_TIME_S)
    await expect(
      integrationPage.commentElements().filter({ hasText: VALID_TEXT })
    ).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })

  await expect(
    integrationPage.commentElements().filter({ hasText: INVALID_TEXT })
  ).toHaveCount(0)

  await expect(
    integrationPage.commentElements().filter({ hasText: MODE_2_TEXT })
  ).toBeVisible()
})
