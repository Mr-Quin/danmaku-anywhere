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
 * Generic happy-path proof for the integration auto-mount pipeline. Covers
 * the full chain — URL match → XPath policy → media-info extraction →
 * auto-mount → render at correct timestamp — with no site-specific
 * dependencies. Two scenarios: a native top-frame video, and a video hosted
 * inside a same-origin iframe (the player content script runs in every
 * frame, the controller only in the top frame). Both resolve through the
 * LocalMatchingStrategy against a seeded custom episode, so no provider
 * network calls are exercised here — that's covered by sources/*.spec.ts.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const IFRAME_URL = `${ORIGIN}/iframe/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const EPISODE_TITLE = 'DA Integration Test'
// 3 comments at known timestamps so a seek past `SEEK_TIME_S` lands the
// renderer's cursor on at least the first one and emits a DOM node.
const COMMENTS = [
  { p: '12,1,16777215,e2e-1', m: 'first' },
  { p: '24,1,16777215,e2e-2', m: 'second' },
  { p: '36,1,16777215,e2e-3', m: 'third' },
]
const SEEK_TIME_S = 15

async function seedFixtureProfile(
  context: import('@playwright/test').BrowserContext,
  da: Awaited<ReturnType<typeof getDaClient>>
): Promise<{ episodeId: number }> {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })

  // Custom (MacCMS) episode keyed to the title the integration extracts from
  // the fixture page. LocalMatchingStrategy's fuzzy fallback matches by
  // title path-last-segment, so this resolves without naming rules.
  const customEpisode = await da.episode.addCustom({
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

  // MountConfig write triggers async content-script registration — wait for
  // it before navigating or the controller never loads on the page.
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  return { episodeId: customEpisode.id }
}

test('integration auto-mount: native <video> happy path', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)
  const { episodeId } = await seedFixtureProfile(context, da)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  // Auto-mount has to thread URL match → policy extraction → local match →
  // mount. No provider network round-trips on this path; the 15s budget is
  // a safety margin for the observer's 1s discovery interval and React
  // mount latency.
  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  // Cross the first comment's timestamp. handleSeek + handleTimeupdate in
  // the renderer's bindVideo plugin should emit at least one DOM node.
  await integrationPage.playVideo()
  await integrationPage.setVideoTime(SEEK_TIME_S)

  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 10_000,
  })
})

test('integration auto-mount: same-origin iframe <video> happy path', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)
  const { episodeId } = await seedFixtureProfile(context, da)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(IFRAME_URL, 'iframe-host.html', {
    extraFixtures: { 'iframe-inner.html': 'iframe-inner.html' },
  })

  // Same mount pipeline, but the <video> lives in a child frame. The
  // controller (top frame only) extracts media info; the player content
  // script (allFrames: true) running inside the iframe is what actually
  // mounts the renderer onto the video.
  await integrationPage.useIframeVideo('iframe[data-testid="da-iframe"]')

  const mirror = await da.mount.waitForMount(undefined, 15_000)
  expect(mirror.isMounted).toBe(true)
  expect(mirror.episodeIds).toEqual([episodeId])

  await integrationPage.playVideo()
  await integrationPage.setVideoTime(SEEK_TIME_S)

  await expect(integrationPage.commentElements().first()).toBeVisible({
    timeout: 10_000,
  })
})
