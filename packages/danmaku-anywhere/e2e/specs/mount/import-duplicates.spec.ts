import { ImportPage } from '../../pom/ImportPage'
import { expect, test } from '../../setup/fixtures'
import { loadTextFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Importing the same local danmaku files twice through the standalone /import
 * page. Asserts the second import reports how many files were already in the
 * library and adds no custom episodes.
 */

test('re-importing the same files skips them and says how many', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  const xml = Buffer.from(loadTextFixture('bilibili-xml.xml'))
  const files = [
    { name: '01.xml', mimeType: 'text/xml', buffer: xml },
    { name: '02.xml', mimeType: 'text/xml', buffer: xml },
  ]

  const importPage = await ImportPage.open(page, extensionId)
  await importPage.selectFiles(files)
  await importPage.result.confirm()
  await importPage.result.expectSuccess()
  await expect(importPage.result.alreadyImported()).toBeHidden()
  await importPage.result.close()

  await importPage.selectFiles(files)
  await importPage.result.confirm()

  await expect(importPage.result.alreadyImported()).toHaveText(
    /^(Skipped 2 files already in the library|已跳过 2 个弹幕库中已有的文件)$/
  )
  expect(await da.episode.listCustom()).toHaveLength(2)
})
