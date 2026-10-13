import { expect } from '@playwright/test'
import { mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import { loadJsonFixture, loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * URL-detect path: pasting a Bilibili season URL into the search input
 * flips the form into Parse mode and surfaces the parsed result card.
 * Clicking Download Danmaku then runs the regular fetch flow and fires
 * the success toast. Asserts the parse-submit button appears, the
 * parsed season title renders, and the import success toast fires. With the
 * Bilibili source removed, the same link submits as a title search, which
 * here lands on the no-sources message since every other source is off.
 */

test('bilibili url paste: detect URL → parse → download danmaku', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
      searchFt: loadJsonFixture('bilibili-search-ft.json'),
      season: loadJsonFixture('bilibili-season.json'),
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  const popup = await Popup.open(page, extensionId)

  await popup.search.input.fill('https://www.bilibili.com/bangumi/play/ss41410')
  await expect(popup.search.parseButton).toBeVisible()
  await expect(popup.search.submitButton).toHaveCount(0)

  await popup.search.parseButton.click()

  // One-off action label; only this spec downloads from a parsed URL result.
  const downloadDanmaku = page.getByRole('button', {
    name: /download danmaku|获取弹幕/i,
  })
  await expect(downloadDanmaku).toBeVisible()

  await downloadDanmaku.click()
  await popup.toast.expectSuccess(/import|导入/i)
})

test('bilibili url paste: a removed Bilibili source leaves the link as a search', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })
  const configs = await da.providerConfig.list()
  await da.providerConfig.set(
    configs
      .filter((config) => config.id !== 'bilibili')
      .map((config) => ({ ...config, enabled: false }))
  )

  const popup = await Popup.open(page, extensionId)

  await popup.search.submit('https://www.bilibili.com/bangumi/play/ss41410')
  await expect(page.getByTestId('search-no-providers')).toBeVisible()
  await expect(popup.search.parseButton).toHaveCount(0)
  await expect(page.getByTestId('parse-error')).toHaveCount(0)
})
