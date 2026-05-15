import {
  DanmakuSourceType,
  type EpisodeInsert,
  type SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'
import { readFile } from 'fs/promises'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Export actions on the DanmakuTree (/mount). Two paths exercised
 * through the season context menu:
 *   - `export` (XML) — downloads a `.xml` payload starting with the
 *     `<i>` root element produced by `commentsToXml`.
 *   - `exportBackup` (JSON) — downloads a `.json` payload that round-
 *     trips through JSON.parse and carries the seeded episode's title
 *     + commentCount.
 *
 * Each test seeds a season + exactly one episode so the export emits a
 * single-file download (multi-episode exports zip; out of scope here).
 * Downloads are captured via Playwright's `page.waitForEvent('download')`
 * and read from `download.path()` — Playwright auto-manages the temp file
 * and cleans it up when the browser context closes.
 */

const SEASON: SeasonInsert = {
  provider: DanmakuSourceType.Bilibili,
  providerIds: { seasonId: 41410, mediaId: 28219412 },
  providerConfigId: 'builtin:bilibili',
  indexedId: '41410',
  title: '葬送的芙莉莲',
  type: '番剧',
  imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
  episodeCount: 28,
  year: 2023,
  schemaVersion: 1,
}

function makeEpisode(seasonId: number): EpisodeInsert {
  return {
    provider: DanmakuSourceType.Bilibili,
    providerIds: { cid: 1300001, aid: 100001, bvid: 'BV1aaaaaaaa' },
    indexedId: '1300001',
    title: 'Ep1',
    episodeNumber: '1',
    seasonId,
    comments: [
      { p: '0.00,1,25,16777215,0,0,0,0', m: 'hello' },
      { p: '1.00,1,25,16777215,0,0,0,0', m: 'world' },
    ],
    commentCount: 2,
    schemaVersion: 4,
    lastChecked: 0,
  }
}

test('mount tree: season export downloads an XML payload', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  // waitForEvent must be armed before the click that triggers the
  // download.
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
  await popup.mount.openItemMenu(seasonItem, 'export')
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.xml$/i)

  const path = await download.path()
  const content = await readFile(path, 'utf-8')

  expect(content).toContain('<i>')
  expect(content).toContain('</i>')
  expect(content).toContain('hello')
  expect(content).toContain('world')
})

test('mount tree: season exportBackup downloads a JSON payload', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const season = await da.season.add(SEASON)
  const ep = await da.episode.add(makeEpisode(season.id))

  const popup = await Popup.open(page, extensionId, '/mount')
  const seasonItem = await popup.mount.waitForSeason(season.id)

  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
  await popup.mount.openItemMenu(seasonItem, 'exportBackup')
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.json$/i)

  const path = await download.path()
  const content = await readFile(path, 'utf-8')

  const parsed = JSON.parse(content) as {
    title?: string
    commentCount?: number
    comments?: unknown[]
  }
  expect(parsed.title).toBe(ep.title)
  expect(parsed.commentCount).toBe(2)
  expect(Array.isArray(parsed.comments)).toBe(true)
  expect(parsed.comments).toHaveLength(2)
})
