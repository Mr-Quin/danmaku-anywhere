import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * Opens the debug overlay and asserts debug-store-json parses to a snapshot
 * with the expected shape and fake backend mode. After driving a trending ->
 * details navigation, the recorded backend calls list is non-empty, empirical
 * proof the fake backend actually fired for the rendered UI.
 */
test('debug overlay exposes a valid store snapshot and recorded calls', async ({
  page,
}) => {
  await bootApp(page)
  const shell = new Shell(page)

  await shell.trending.openDetails(shell.trending.firstCard())
  await expect(shell.details.lane).toBeVisible()

  await shell.debug.open()
  const snapshot = await shell.debug.snapshot()
  expect(snapshot.backendMode).toBe('fake')
  expect(Array.isArray(snapshot.columns)).toBe(true)
  expect(snapshot.columns.length).toBeGreaterThan(0)

  await expect(shell.debug.calls().first()).toBeVisible()
  expect(await shell.debug.calls().count()).toBeGreaterThan(0)
})
