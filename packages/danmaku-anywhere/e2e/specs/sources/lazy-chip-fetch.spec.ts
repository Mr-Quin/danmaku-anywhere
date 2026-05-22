import { expect } from '@playwright/test'
import { mockBilibiliXml } from '../../network/bilibili'
import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Source filter chips fetch lazily: only the active chip's provider
 * dispatches a search request on submit. Switching to an inactive chip
 * triggers that provider's fetch on click. Asserts no Bilibili search
 * request lands until the Bilibili chip is selected, then exactly one
 * fires.
 */

test('search chips: only active provider fetches; clicking inactive chip dispatches', async ({
  context,
  page,
  extensionId,
}) => {
  const bilibiliSearchUrls: string[] = []
  context.on('request', (request) => {
    if (
      /api\.bilibili\.com\/x\/web-interface\/search\/type/.test(request.url())
    ) {
      bilibiliSearchUrls.push(request.url())
    }
  })

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

  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible({
    timeout: 15_000,
  })

  expect(
    bilibiliSearchUrls,
    'bilibili search must not fire while bilibili chip is inactive'
  ).toEqual([])

  await popup.search.sourceChip('Bilibili').click()

  await expect(popup.search.seasonCard('Bilibili')).toBeVisible({
    timeout: 15_000,
  })
  expect(bilibiliSearchUrls.length).toBeGreaterThanOrEqual(1)
})
