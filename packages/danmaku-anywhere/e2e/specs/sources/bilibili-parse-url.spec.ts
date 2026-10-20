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
 * parsed season title renders, and the import success toast fires. A link
 * that no installed source claims, because Bilibili was removed or the path
 * matches no pattern, shows that no source can read it instead of searching,
 * with or without a scheme, and a title that only looks like a link can still
 * be searched from that notice.
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

test('bilibili url paste: with Bilibili removed, no source reads the link', async ({
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
    configs.filter((config) => config.id !== 'bilibili')
  )

  const popup = await Popup.open(page, extensionId)

  await popup.search.submit('https://www.bilibili.com/bangumi/play/ss41410')
  await expect(page.getByTestId('parse-no-source')).toBeVisible()
  await expect(popup.search.parseButton).toBeDisabled()
})

test('bilibili url paste: a link on a path no manifest claims is not searched', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const popup = await Popup.open(page, extensionId)

  await popup.search.submit('https://www.bilibili.com/bangumi/media/md28229051')
  await expect(page.getByTestId('parse-no-source')).toBeVisible()
  await expect(popup.search.parseButton).toBeDisabled()
  await expect(popup.search.resultCountSkeleton).toHaveCount(0)
})

test('bilibili url paste: an unclaimed link typed without a scheme is not searched', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
  })

  const popup = await Popup.open(page, extensionId)

  await popup.search.submit('www.bilibili.com/bangumi/media/md28229051')
  await expect(page.getByTestId('parse-no-source')).toBeVisible()
  await expect(popup.search.parseButton).toBeDisabled()
  await expect(popup.search.resultCountSkeleton).toHaveCount(0)
})

test('bilibili url paste: a title that looks like a link can be searched by title', async ({
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

  await popup.search.input.fill('Re.Zero/2 ')
  await expect(popup.search.noSourceNotice).toBeVisible()
  await popup.search.searchInsteadButton.click()

  await expect(popup.search.seasonCard('Bilibili')).toBeVisible()
  await expect(popup.search.input).toHaveValue('Re.Zero/2')
  await expect(popup.search.noSourceNotice).toHaveCount(0)
})
