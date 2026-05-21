import { CONTROLLER_ROOT_ID } from '../../../src/content/controller/common/constants/rootId'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'

/**
 * Mounts the controller on a host-origin page and asserts the injected
 * font CSS declares @font-face with absolute chrome-extension:// woff2
 * URLs — no bundler-relative paths that 404 against the host origin
 * inside the shadow DOM.
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

  await expect(page.locator(`#${CONTROLLER_ROOT_ID}`)).toBeAttached({
    timeout: 15_000,
  })

  const result = await page.evaluate((rootId) => {
    const shadow = document.getElementById(rootId)?.shadowRoot
    if (!shadow) {
      throw new Error('controller shadow root missing or not open')
    }
    const styleText = Array.from(shadow.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')
    return {
      fontFaceRuleCount: (styleText.match(/@font-face/g) ?? []).length,
      hasExtensionWoffUrls:
        /url\(\s*['"]?chrome-extension:\/\/[^)'"]*\.woff/i.test(styleText),
      hasRelativeWoffUrls: /url\(\s*['"]?\/[^)'" ]*\.woff/i.test(styleText),
    }
  }, CONTROLLER_ROOT_ID)

  expect(result.fontFaceRuleCount).toBeGreaterThan(0)
  expect(result.hasExtensionWoffUrls).toBe(true)
  expect(result.hasRelativeWoffUrls).toBe(false)
})
