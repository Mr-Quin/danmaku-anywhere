import { Shell } from '../../pom/Shell'
import { bootAppWithKazumiRules, expect, test } from '../../setup/fixtures'

/**
 * Drives the full watch path to the kazumi playback lane: the video host
 * mounts a media element, the debug overlay reports a playing show, and the
 * next-episode control advances the selected episode (the displayed episode
 * title changes). Proves playback and episode navigation are wired end to end.
 */
test('kazumi playback mounts the player and advances episodes', async ({
  page,
}) => {
  await bootAppWithKazumiRules(page)
  const shell = new Shell(page)

  await shell.trending.firstCard().getByRole('button', { name: '观看' }).click()
  await expect(shell.kazumiSearch.input()).toBeVisible()
  await shell.kazumiSearch.search('葬送的芙莉莲')
  await expect(shell.kazumiSearch.results().first()).toBeVisible()
  await shell.kazumiSearch.results().first().click()

  await expect(shell.kazumiDetail.lane).toBeVisible()
  await expect(shell.kazumiDetail.videoHost().locator('video')).toBeAttached()
  await expect(shell.kazumiDetail.episodes().first()).toBeVisible()

  await shell.debug.open()
  await expect(shell.debug.playing()).not.toHaveText('-')

  const titleBefore = (
    await shell.kazumiDetail.episodeTitle().textContent()
  )?.trim()
  await expect(shell.kazumiDetail.next()).toBeEnabled()
  await shell.kazumiDetail.next().click()
  await expect
    .poll(async () => {
      return (await shell.kazumiDetail.episodeTitle().textContent())?.trim()
    })
    .not.toBe(titleBefore)
})
