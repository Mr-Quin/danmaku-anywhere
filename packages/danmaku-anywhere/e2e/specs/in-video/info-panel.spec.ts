import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * In-video info panel on the auto-mount happy path. After an integration match
 * mounts danmaku on a native <video>, the panel renders in the player shadow
 * root, its headline reflects the mounted substate, and hovering expands it to
 * surface the comment count. Asserts the rendered panel DOM, not just state.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_TITLE = 'DA Integration Test'
const COMMENTS = [
  { p: '12,1,16777215,e2e-1', m: 'first' },
  { p: '24,1,16777215,e2e-2', m: 'second' },
  { p: '36,1,16777215,e2e-3', m: 'third' },
]

test('info panel reflects the mounted state in-video', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)

  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })
  const episode = await da.episode.addCustom({
    provider: DanmakuSourceType.MacCMS,
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

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episode.id])

  await integrationPage.playVideo()

  await expect(integrationPage.infoPanel()).toBeVisible()
  await expect(integrationPage.infoPanelHeadline()).toHaveText(
    /Mounted|已加载/,
    {
      timeout: 5_000,
    }
  )

  await integrationPage.infoPanel().hover()
  await expect(integrationPage.infoPanelCount()).toHaveText(
    String(COMMENTS.length)
  )
})
