import fs from 'node:fs/promises'
import { encodeEnvelope } from '../../../src/common/options/OptionsService/storeLayout'
import { danmakuOptionsDescriptor } from '../../../src/common/options/optionStores'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A danmakuOptions store split over several sync items, with one chunk that
 * never arrives, reads as incomplete. The failure screen first offers Retry
 * alone, since the chunk may still be syncing in. Once a second upgrade
 * attempt has failed it also offers Reset, which downloads a recovery copy of
 * the raw items and lets the popup open.
 */

test.use({
  expectedConsoleErrors: [
    'Failed to upgrade',
    'Options upgrade failed',
    'Failed to read danmakuOptions',
  ],
})

interface StoredDanmakuOptions {
  version: number
  data: Record<string, unknown>
}

test('a torn split store gets Reset once a second attempt has failed', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  const stored = (await da.storage.get(
    'sync',
    'danmakuOptions'
  )) as StoredDanmakuOptions
  const filters = Array.from({ length: 600 }, (_, index) => ({
    type: 'text',
    value: `剧透关键词${index}`,
    enabled: true,
  }))
  const items = encodeEnvelope(
    danmakuOptionsDescriptor,
    { version: stored.version, data: { ...stored.data, filters } },
    {}
  )
  const missing = 'danmakuOptions.filters.1'
  expect(Object.keys(items)).toContain(missing)
  for (const [key, value] of Object.entries(items)) {
    if (key !== missing) {
      await da.storage.setRaw('sync', key, value)
    }
  }
  await expect(da.runtime.runUpgrade()).rejects.toThrow(/danmakuOptions/)

  const popup = await Popup.open(page, extensionId)
  await expect(popup.optionsUpgrade.failedStore('danmakuOptions')).toHaveText(
    /(incomplete|不完整)/
  )
  await expect(popup.optionsUpgrade.resetButton('danmakuOptions')).toHaveCount(
    0
  )

  await popup.optionsUpgrade.retryButton().click()
  await expect(popup.optionsUpgrade.resetButton('danmakuOptions')).toBeVisible()

  const download = page.waitForEvent('download')
  await popup.optionsUpgrade.resetButton('danmakuOptions').click()
  await popup.dialog.confirm()
  const copy = JSON.parse(
    await fs.readFile(await (await download).path(), 'utf-8')
  )
  expect(copy.store).toBe('danmakuOptions')
  expect(Object.keys(copy.items)).toContain('danmakuOptions.filters.0')
  expect(Object.keys(copy.items)).not.toContain(missing)
  await popup.optionsUpgrade.expectUpgraded()
})
