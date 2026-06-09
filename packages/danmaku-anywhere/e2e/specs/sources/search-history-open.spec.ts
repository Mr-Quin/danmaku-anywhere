import { expect } from '@playwright/test'
import { mockBilibiliXml } from '../../network/bilibili'
import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Returning from season details must not reopen the history dropdown over the
 * source chips: the remount refocuses the input, but a committed search keeps
 * openOnFocus suppressed so the chips stay clickable. Typing still reopens
 * history, and a fresh popup with no committed search still auto-opens it.
 */

test('returning from season details keeps the history dropdown off the source chips', async ({
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

  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()
  await expect(popup.search.sourceChip('Bilibili')).toBeVisible()

  await popup.search.openFirstResult('DanDanPlay')

  await page.goBack()

  await expect(popup.search.input).toHaveValue('frieren')
  await expect(popup.search.sourceChip('Bilibili')).toBeVisible()
  await expect(popup.search.historyOption('frieren')).toBeHidden()

  await popup.search.sourceChip('Bilibili').click()
  await expect(popup.search.sourceChip('Bilibili')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(popup.search.seasonCard('Bilibili')).toBeVisible()

  await popup.search.input.fill('fri')
  await expect(popup.search.historyOption('frieren')).toBeVisible()
})

test('history auto-opens on focus for a fresh search', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: {
      dandanplay: { enabled: true },
    },
    rawStorage: [
      {
        area: 'local',
        key: 'searchHistory',
        value: { data: { entries: ['frieren'] }, version: 1 },
      },
    ],
  })

  const popup = await Popup.open(page, extensionId)

  await expect(popup.search.historyOption('frieren')).toBeVisible()
})
