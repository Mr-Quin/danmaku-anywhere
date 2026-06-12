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
 * In-video info panel as a multi-source surface. After an integration match
 * mounts danmaku on a native <video>, the pipeline row renders in the player
 * shadow root with its source and (mounted) success severity on the row, its
 * headline reflects the mounted substate, and hovering expands it to show the
 * comment count and the localized provider chip. Asserts rendered panel DOM.
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

  // The pipeline row renders with its source and the mounted (success) severity.
  await expect(integrationPage.infoPanelRow('pipeline')).toBeVisible({
    timeout: 5_000,
  })
  await expect(
    integrationPage.infoPanelRowWithSev('pipeline', 'success')
  ).toBeVisible()
  await expect(integrationPage.infoPanelHeadline()).toHaveText(/Mounted|已加载/)

  await integrationPage.infoPanel().hover()
  await expect(integrationPage.infoPanelCount()).toHaveText(
    String(COMMENTS.length)
  )
  // The provider is localized, not the raw enum (MacCMS, not "Custom").
  await expect(integrationPage.infoPanelSourceChip()).toHaveText(/MacCMS/)
})
