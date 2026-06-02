import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * In fake mode the extension reads as installed, so the no-extension page must
 * never render. Asserts the no-extension fallback is absent while a
 * require-extension lane (trending) still renders its grid, proving the gate
 * resolved to "installed" rather than hiding the whole app.
 */
test('no-extension page is absent and the trending grid renders', async ({
  page,
}) => {
  await bootApp(page)
  const shell = new Shell(page)

  await expect(shell.noExtensionPage()).toHaveCount(0)
  await expect(shell.trending.lane).toBeVisible()
  await expect(shell.trending.cards().first()).toBeVisible()
})
