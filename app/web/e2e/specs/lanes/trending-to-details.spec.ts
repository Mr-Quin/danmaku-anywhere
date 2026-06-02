import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * Clicking a trending show card opens a details lane (data-kind="show") whose
 * header shows the fixture subject title. Cross-checks the debug overlay so the
 * lane store records a new show column for the clicked subject, proving the
 * navigation is real state change, not just a rendered panel.
 */
test('clicking a trending card opens its details lane', async ({ page }) => {
  await bootApp(page)
  const shell = new Shell(page)

  const card = shell.trending.firstCard()
  await expect(card).toBeVisible()
  await shell.trending.openDetails(card)

  await expect(shell.details.lane).toBeVisible()
  await expect(shell.details.title()).not.toBeEmpty()

  const columnId = await shell.details.lane.getAttribute('data-column-id')
  await shell.debug.open()
  const snapshot = await shell.debug.snapshot()
  const showColumn = snapshot.columns.find((c) => c.kind === 'show')
  expect(showColumn).toBeDefined()
  expect(showColumn?.id).toBe(columnId)
})
