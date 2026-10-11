import { Shell } from '../../pom/Shell'
import { bootAppWithKazumiRules, expect, test } from '../../setup/fixtures'

/**
 * Opens a kazumi search lane from a trending card's watch action, runs a
 * keyword search against the fake kazumi catalog, and asserts the fixture
 * results render. Clicking a result opens the kazumi playback lane
 * (data-kind="player"), proving the search-to-watch handoff works.
 */
test('kazumi search returns fixture results and opens playback', async ({
  page,
}) => {
  await bootAppWithKazumiRules(page)
  const shell = new Shell(page)

  await shell.trending.firstCard().getByRole('button', { name: '观看' }).click()
  await expect(shell.kazumiSearch.lane).toBeVisible()
  await expect(shell.kazumiSearch.input()).toBeVisible()

  await shell.kazumiSearch.search('葬送的芙莉莲')
  await expect(shell.kazumiSearch.results().first()).toBeVisible()
  expect(await shell.kazumiSearch.results().count()).toBeGreaterThan(0)

  await shell.kazumiSearch.results().first().click()
  await expect(shell.kazumiDetail.lane).toBeVisible()
})
