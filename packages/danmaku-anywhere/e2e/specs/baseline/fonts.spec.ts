import { CONTROLLER_ROOT_ID } from '../../../src/content/controller/common/constants/rootId'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'

/**
 * Mounts the controller on a host-origin page and asserts every injected
 * font <link> uses a chrome-extension:// href and that no inline <style>
 * inside the shadow carries a /assets/*.woff fallback that would 404
 * against the host origin.
 */

const HOST_ORIGIN = 'https://da-test.invalid'
const HOST_URL = `${HOST_ORIGIN}/fonts/`
const MOUNT_PATTERN = `${HOST_ORIGIN}/*`
const EXPECTED_FONT_LINK_COUNT = 4

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

  await expect(page.locator(`#${CONTROLLER_ROOT_ID}`)).toBeAttached({
    timeout: 15_000,
  })

  const result = await page.evaluate(async (rootId) => {
    const shadow = document.getElementById(rootId)?.shadowRoot
    if (!shadow) {
      throw new Error('controller shadow root missing or not open')
    }

    const links = Array.from(
      shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    )
    // Throw on load error so the test surfaces the failing href instead of
    // timing out on a vague Promise.all hang.
    await Promise.all(
      links.map((link) => {
        if (link.sheet) {
          return null
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
      hasRelativeFontUrl: /url\(\s*['"]?\/assets\/[^)]*\.woff/i.test(styleText),
    }
  }, CONTROLLER_ROOT_ID)

  expect(result.hrefs).toHaveLength(EXPECTED_FONT_LINK_COUNT)
  for (const href of result.hrefs) {
    expect(href).toMatch(/^chrome-extension:\/\//)
  }
  expect(result.hasRelativeFontUrl).toBe(false)
})
