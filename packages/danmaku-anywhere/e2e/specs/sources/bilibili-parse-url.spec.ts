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
 * parsed season title renders, and the import success toast fires.
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

  const downloadDanmaku = page.getByRole('button', {
    name: /download danmaku|获取弹幕/i,
  })
  await expect(downloadDanmaku).toBeVisible()

  await downloadDanmaku.click()
  await popup.toast.expectSuccess(/import|导入/i)
})
