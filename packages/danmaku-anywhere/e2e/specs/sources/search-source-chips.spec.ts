import { expect } from '@playwright/test'
import { mockBilibiliXml } from '../../network/bilibili'
import { mockDandanplay } from '../../network/dandanplay'
import { mockTencent } from '../../network/tencent'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Source filter chip selection survives navigation into season details and
 * back: picking the Bilibili chip then returning keeps Bilibili active rather
 * than resetting to the first provider. Also covers chip overflow at a narrow
 * width: providers that don't fit collapse into a +N chip whose menu activates
 * the hidden source and swaps it into the visible row.
 */

test('source chips: selection persists across season details navigation', async ({
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

  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()

  await popup.search.sourceChip('Bilibili').click()
  await expect(popup.search.sourceChip('Bilibili')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await popup.search.openFirstResult('Bilibili')

  await page.goBack()

  await expect(popup.search.sourceChip('Bilibili')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(popup.search.seasonCard('Bilibili')).toBeVisible()
})

test('source chips: overflow collapses into a +N menu that activates hidden sources', async ({
  context,
  page,
  extensionId,
}) => {
  await page.setViewportSize({ width: 240, height: 640 })

  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      dandanplay: { enabled: true },
      bilibili: { enabled: true },
      tencent: { enabled: true },
    },
    network: [
      mockDandanplay({
        search: loadJsonFixture('ddp-search.json'),
        bangumi: loadJsonFixture('ddp-bangumi.json'),
        comments: loadJsonFixture('ddp-comments.json'),
      }),
      ...mockTencent({
        search: loadJsonFixture('tencent-search.json'),
        episodes: loadJsonFixture('tencent-episodes.json'),
        danmakuBase: loadJsonFixture('tencent-danmaku-base.json'),
        danmakuSegments: {
          '0': loadJsonFixture('tencent-danmaku-segment-0.json'),
          '30000': loadJsonFixture('tencent-danmaku-segment-30000.json'),
        },
      }),
    ],
  })

  const popup = await Popup.open(page, extensionId, '/search', {
    detached: true,
  })
  await popup.search.submit('frieren')

  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()
  await expect(popup.search.overflowChip).toBeVisible()

  await popup.search.overflowChip.click()
  await popup.search.overflowMenuItem('tencent').click()

  await expect(popup.search.sourceChip('Tencent')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(popup.search.seasonCard('Tencent')).toBeVisible()
})
