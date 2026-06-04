import { expect } from '@playwright/test'
import { ColorMode } from '../../../src/common/theme/enums'
import { mockBilibiliXml } from '../../network/bilibili'
import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Search page styling regressions. The source filter chip must render with
 * the theme typography font instead of inheriting the UA serif fallback, and
 * the search history dropdown text must stay readable (light) in dark mode
 * rather than inheriting near-black and vanishing on the dark paper.
 */

function relativeLuminance(color: string): number {
  const match = color.match(/\d+(\.\d+)?/g)
  if (!match) {
    throw new Error(`unparseable color: ${color}`)
  }
  const [r, g, b] = match.slice(0, 3).map((c) => {
    const channel = Number(c) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

test('source filter chip uses the theme font, not the UA serif fallback', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
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

  const fontFamily = await chip.evaluate(
    (el) => getComputedStyle(el).fontFamily
  )
  expect(fontFamily).toContain('Plus Jakarta Sans')
})

test('search history dropdown text is readable in dark mode', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
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

  await popup.search.input.click()

  const option = popup.search.historyOption('frieren')
  await expect(option).toBeVisible()

  const color = await option.evaluate((el) => getComputedStyle(el).color)
  expect(relativeLuminance(color)).toBeGreaterThan(0.5)
})
