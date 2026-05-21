import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'

/**
 * Bundled variable fonts must load inside the controller's content-script
 * shadow DOM on host-origin pages — the exact context where DA-523 broke.
 * Asserts the injected <link>s use chrome-extension:// hrefs, their CSS
 * loads (link.sheet populated), and no inline <style> inside the shadow
 * contains a /assets/*.woff fallback path (regression guard against
 * re-introducing the bundled @fontsource CSS imports).
 */

const HOST_ORIGIN = 'https://da-test.invalid'
const HOST_URL = `${HOST_ORIGIN}/fonts/`
const MOUNT_PATTERN = `${HOST_ORIGIN}/*`

test('content-script controller loads fonts from extension origin', async ({
  context,
  page,
}) => {
  const da = await getDaClient(context)
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    name: 'da-e2e-fonts',
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  const integrationPage = new IntegrationPage(page)
  await integrationPage.open(HOST_URL, 'native-video.html')
  await page.bringToFront()

  await expect(page.locator('#danmaku-anywhere-controller')).toBeAttached({
    timeout: 15_000,
  })

  const result = await page.evaluate(async () => {
    const root = document.querySelector('#danmaku-anywhere-controller')
    if (!root?.shadowRoot) {
      throw new Error('controller shadow root missing or not open')
    }
    const shadow = root.shadowRoot

    const links = Array.from(
      shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    )
    await Promise.all(
      links.map((link) => {
        if (link.sheet) {
          return Promise.resolve()
        }
        return new Promise<void>((resolve, reject) => {
          link.addEventListener('load', () => resolve(), { once: true })
          link.addEventListener(
            'error',
            () => reject(new Error(`stylesheet failed to load: ${link.href}`)),
            { once: true }
          )
        })
      })
    )

    const styleText = Array.from(shadow.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')

    return {
      hrefs: links.map((l) => l.href),
      sheetsLoaded: links.map((l) => l.sheet !== null),
      hasRelativeFontUrl: /url\(\s*['"]?\/assets\/[^)]*\.woff/i.test(styleText),
    }
  })

  expect(result.hrefs.length).toBeGreaterThan(0)
  for (const href of result.hrefs) {
    expect(href, `font link href: ${href}`).toMatch(/^chrome-extension:\/\//)
  }
  for (const [i, loaded] of result.sheetsLoaded.entries()) {
    expect(loaded, `stylesheet loaded: ${result.hrefs[i]}`).toBe(true)
  }
  expect(
    result.hasRelativeFontUrl,
    'no inline <style> may contain /assets/*.woff refs (host-origin 404)'
  ).toBe(false)
})
