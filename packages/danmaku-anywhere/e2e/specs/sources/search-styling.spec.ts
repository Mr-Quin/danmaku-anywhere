import { ColorMode } from '../../../src/common/theme/enums'
import { mockBilibiliXml } from '../../network/bilibili'
import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Search page styling regressions, asserted against what actually paints.
 * The source filter chip text must be painted by a bundled theme font (read
 * via CDP CSS.getPlatformFontsForNode, the same source as DevTools' Rendered
 * Fonts panel) rather than the UA serif fallback. The history dropdown must
 * establish its own readable text color so it survives a context that strips
 * inherited color, as the content-script shadow root does.
 */

function parseRgb(color: string): [number, number, number] {
  const channels = color.match(/\d+(\.\d+)?/g)
  if (!channels || channels.length < 3) {
    throw new Error(`unparseable color: ${color}`)
  }
  return [Number(channels[0]), Number(channels[1]), Number(channels[2])]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const channel = c / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrastRatio(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b))
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b))
  return (lighter + 0.05) / (darker + 0.05)
}

test('source filter chip text is painted by the bundled theme font, not a serif fallback', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: {
      dandanplay: { enabled: true },
      bilibili: { enabled: true },
    },
    network: [
      mockDandanplay({
        search: loadJsonFixture('ddp-search.json'),
        bangumi: loadJsonFixture('ddp-bangumi.json'),
        comments: loadJsonFixture('ddp-comments.json'),
      }),
      ...mockBilibiliXml({
        searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
        searchFt: loadJsonFixture('bilibili-search-ft.json'),
        season: loadJsonFixture('bilibili-season.json'),
        xml: loadTextFixture('bilibili-xml.xml'),
      }),
    ],
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')

  const chip = popup.search.sourceChip('DanDanPlay')
  await expect(chip).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument', {
    depth: -1,
    pierce: true,
  })
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[data-testid="source-chip-DanDanPlay"]',
  })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  await cdp.detach()

  expect(fonts.length, 'chip text rendered no fonts').toBeGreaterThan(0)
  const dominant = fonts.reduce((a, b) => (b.glyphCount > a.glyphCount ? b : a))
  expect(
    dominant.isCustomFont,
    `chip should paint with the bundled woff2, got: ${JSON.stringify(fonts)}`
  ).toBe(true)
  expect(dominant.familyName).toContain('Jakarta')
})

test('search history dropdown text stays readable when ambient color is stripped', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { theme: { colorMode: ColorMode.Dark } },
    providers: {
      dandanplay: { enabled: true },
    },
    network: [
      mockDandanplay({
        search: loadJsonFixture('ddp-search.json'),
        bangumi: loadJsonFixture('ddp-bangumi.json'),
        comments: loadJsonFixture('ddp-comments.json'),
      }),
    ],
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()

  // The content-script controller portals this dropdown into its shadow root,
  // where shadow.css `all: initial` strips inherited color. The popup keeps an
  // ambient light color the dropdown would otherwise lean on, so neutralize
  // the portal root's color to exercise the same condition: the dropdown must
  // supply its own readable text rather than depend on what it inherits.
  await page.evaluate(() => {
    document.body.style.setProperty('color', 'rgb(0, 0, 0)')
  })

  await popup.search.input.click()

  const option = popup.search.historyOption('frieren')
  await expect(option).toBeVisible()

  const { color, background } = await option.evaluate((el) => {
    // Walk to the first fully opaque background: the visible color behind the
    // text is the paper, not the highlighted option's alpha overlay.
    let node: HTMLElement | null = el
    let resolved = 'rgb(255, 255, 255)'
    while (node) {
      const bg = getComputedStyle(node).backgroundColor
      const channels = bg.match(/[\d.]+/g)
      if (channels && (channels.length === 3 || Number(channels[3]) === 1)) {
        resolved = bg
        break
      }
      node = node.parentElement
    }
    return { color: getComputedStyle(el).color, background: resolved }
  })

  expect(
    contrastRatio(parseRgb(color), parseRgb(background)),
    `history text ${color} is not readable on ${background}`
  ).toBeGreaterThan(4.5)
})
