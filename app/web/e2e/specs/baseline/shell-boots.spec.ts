import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * Boots the fake build through onboarding and asserts the lane shell renders
 * with its trending grid. Cross-checks the debug overlay to prove the app is
 * running against the in-memory fake backend (debug-backend-mode = fake). The
 * auto fixtures enforce a clean console and no foreign network.
 */
test('shell boots into the trending lane on the fake backend', async ({
  page,
}) => {
  await bootApp(page)
  const shell = new Shell(page)

  await expect(shell.root()).toBeVisible()
  await expect(shell.trending.lane).toBeVisible()
  await expect(shell.trending.firstCard()).toBeVisible()

  await shell.debug.open()
  await expect(shell.debug.backendMode()).toHaveText('fake')
})
