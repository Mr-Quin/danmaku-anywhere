import { Shell } from '../../pom/Shell'
import { bootApp, expect, test } from '../../setup/fixtures'

/**
 * Clicking the sidebar theme toggle flips the dark-mode class on <html> and the
 * debug overlay's debug-theme reflects the new scheme. Asserts both the
 * user-visible class change and the store-backed theme value so a CSS-only flip
 * can't pass without the service state agreeing.
 */
test('theme toggle flips the document dark class and debug theme', async ({
  page,
}) => {
  await bootApp(page)
  const shell = new Shell(page)
  const html = page.locator('html')

  await expect(html).toHaveClass(/da-dark/)
  await shell.debug.open()
  await expect(shell.debug.theme()).toHaveText('dark')

  await shell.themeToggle().click()
  await expect(html).not.toHaveClass(/da-dark/)
  await expect(shell.debug.theme()).toHaveText('light')
})
