import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * Inside a details lane, clicking the episodes tab renders the episodes list
 * from the fake backend without any URL navigation. Asserts the episode rows
 * appear and the lane stays the same column (no new lane opens for a tab
 * switch), keeping detail navigation in-lane.
 */
test('details lane switches to the episodes tab in place', async ({ page }) => {
  await bootApp(page)
  const shell = new Shell(page)

  await shell.trending.openDetails(shell.trending.firstCard())
  await expect(shell.details.lane).toBeVisible()

  const lanesBefore = await shell.lanes.count()
  await shell.details.openTab('episodes')
  await expect(shell.details.episodes().first()).toBeVisible()
  expect(await shell.lanes.count()).toBe(lanesBefore)
})
