import { CONTROLLER_ROOT_ID } from '../../../src/content/controller/common/constants/rootId'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { expect, test } from '../../setup/fixtures'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'

/**
 * Mounts the controller on a host-origin page and asserts every variable
 * font is the one actually painting text inside the controller's shadow
 * DOM. Reads CDP CSS.getPlatformFontsForNode (the same source DevTools'
 * Rendered Fonts panel uses), so the assertion fails iff the woff2 isn't
 * registered AND the host page is using a fallback.
 */

const HOST_ORIGIN = 'https://da-test.invalid'
const HOST_URL = `${HOST_ORIGIN}/fonts/`
const MOUNT_PATTERN = `${HOST_ORIGIN}/*`

const FONT_PROBES = [
  { family: 'Plus Jakarta Sans Variable', sample: 'Abcdefg' },
  { family: 'Noto Sans SC Variable', sample: '简体中文' },
  { family: 'Noto Sans TC Variable', sample: '繁體中文' },
  { family: 'Noto Sans JP Variable', sample: 'こんにちは' },
] as const

test('content-script controller paints text using bundled variable fonts', async ({
  context,
  page,
  da,
}) => {
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

  await page.evaluate(
    ({ rootId, probes }) => {
      const shadow = document.getElementById(rootId)?.shadowRoot
      if (!shadow) {
        throw new Error('controller shadow root missing')
      }
      const probeRoot = document.createElement('div')
      probeRoot.id = '__font_probes__'
      // Offscreen but rendered: CSS.getPlatformFontsForNode needs a layout box.
      probeRoot.style.cssText = 'position:fixed;top:-9999px;left:-9999px;'
      for (const { family, sample } of probes) {
        const span = document.createElement('span')
        span.dataset.family = family
        span.style.cssText = `font-family:"${family}",monospace;font-size:32px;`
        span.textContent = sample
        probeRoot.appendChild(span)
      }
      shadow.appendChild(probeRoot)
    },
    { rootId: CONTROLLER_ROOT_ID, probes: FONT_PROBES }
  )

  await page.evaluate(
    async ({ probes }) => {
      await document.fonts.ready
      await Promise.all(
        probes.map(({ family, sample }) =>
          document.fonts.load(`32px "${family}"`, sample)
        )
      )
    },
    { probes: FONT_PROBES }
  )

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  // DOM.requestNode requires the document tree to be populated first.
  await cdp.send('DOM.getDocument', { depth: -1, pierce: true })

  for (const { family } of FONT_PROBES) {
    // DOM.querySelector doesn't pierce shadow roots; round-trip through
    // Runtime.evaluate so the JS-resolved shadow-DOM node becomes a nodeId.
    const evalResult = await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('${CONTROLLER_ROOT_ID}').shadowRoot.querySelector('#__font_probes__ [data-family="${family}"]')`,
    })
    expect(
      evalResult.result.objectId,
      `probe node for ${family} not found in shadow root`
    ).toBeDefined()
    const { nodeId } = await cdp.send('DOM.requestNode', {
      objectId: evalResult.result.objectId,
    })
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    const usedCustom = fonts.find((f) => f.isCustomFont)
    expect(
      usedCustom,
      `${family} should be painted by a bundled woff2, got: ${JSON.stringify(fonts)}`
    ).toBeTruthy()
  }

  await cdp.detach()
})
