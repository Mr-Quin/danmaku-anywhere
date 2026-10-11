import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Refresh Danmaku from an episode's context menu in the DanmakuTree.
 * Seeds an episode, clicks the per-episode Refresh action against a mocked
 * bilibili XML endpoint, and asserts the episode row's comment count. A
 * refresh that brings more comments replaces the stored ones; one that brings
 * fewer, or none, keeps the stored ones and shows a warning naming both counts.
 */

const EMPTY_XML = '<?xml version="1.0" encoding="UTF-8"?><i></i>'

function storedComments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    p: `${i + 1},1,16777215`,
    m: `stored ${i + 1}`,
  }))
}

function mockBilibiliWithXml(xml: string) {
  return mockBilibiliXml({
    searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
    searchFt: loadJsonFixture('bilibili-search-ft.json'),
    season: loadJsonFixture('bilibili-season.json'),
    xml,
  })
}

test('mount tree: refresh danmaku fetches new comments for an episode', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const season = await da.season.add(makeBilibiliSeason())
  const episode = await da.episode.add(makeBilibiliEpisode(season.id))
  expect(episode.commentCount).toBe(0)

  const popup = await Popup.open(page, extensionId, '/mount')
  await popup.mount.waitForSeason(season.id)
  await popup.mount.expandSeason(season.id)

  const episodeItem = await popup.mount.episodeItem(episode.id).first()
  await expect(episodeItem).toBeVisible()

  await popup.mount.openItemMenu(episodeItem, 'refresh')

  await expect
    .poll(async () => (await da.episode.get(episode.id))?.commentCount)
    .toBeGreaterThan(0)

  const refreshed = await da.episode.get(episode.id)
  await expect(popup.mount.episodeCommentCount(episode.id)).toHaveText(
    String(refreshed?.commentCount)
  )
})

for (const { name, xml, fetched } of [
  { name: 'fewer', xml: loadTextFixture('bilibili-xml.xml'), fetched: 3 },
  { name: 'no', xml: EMPTY_XML, fetched: 0 },
]) {
  test(`mount tree: a refresh that returns ${name} comments keeps the stored ones`, async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    await applyProfile(context, da, {
      providers: { bilibili: { enabled: true } },
      network: mockBilibiliWithXml(xml),
    })

    const season = await da.season.add(makeBilibiliSeason())
    const episode = await da.episode.add(
      makeBilibiliEpisode(season.id, { comments: storedComments(5) })
    )

    const popup = await Popup.open(page, extensionId, '/mount')
    await popup.mount.waitForSeason(season.id)
    await popup.mount.expandSeason(season.id)

    const episodeItem = await popup.mount.episodeItem(episode.id).first()
    await expect(episodeItem).toBeVisible()

    await popup.mount.openItemMenu(episodeItem, 'refresh')

    await popup.toast.expectWarning(new RegExp(`${fetched}\\D+5\\D`))
    await expect(popup.toast.bySeverity('success')).toHaveCount(0)
    await expect(popup.mount.episodeCommentCount(episode.id)).toHaveText('5')
    expect((await da.episode.get(episode.id))?.commentCount).toBe(5)
  })
}
