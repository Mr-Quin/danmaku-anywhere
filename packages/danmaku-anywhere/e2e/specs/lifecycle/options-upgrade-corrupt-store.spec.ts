import fs from 'node:fs/promises'
import { LATEST_PROVIDER_CONFIG_VERSION } from '../../../src/common/options/providerConfig/version'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A store the upgrade cannot migrate is kept instead of reset: the popup's
 * failure screen names it and says its data cannot be converted, and the
 * stored value stays as it was. Resetting it from that screen downloads a
 * recovery copy holding the old data, custom source included, puts the store
 * back to its defaults and lets the popup open its pages.
 */

test.use({
  expectedConsoleErrors: ['Failed to upgrade', 'Options upgrade failed'],
})

const CUSTOM_SOURCE_URL = 'https://ddp.selfhosted.invalid/api'

// providerConfig at its first version, where a list was expected
const CORRUPT_PROVIDER_CONFIG = {
  version: 1,
  data: {
    sources: [
      {
        id: 'd9d068cc-d7a5-4277-990b-73b28f7637f8',
        name: 'My DanDanPlay',
        type: 'DanDanPlayCompatible',
        enabled: true,
        options: { baseUrl: CUSTOM_SOURCE_URL },
      },
    ],
  },
}

test('a store the upgrade cannot migrate is kept, explained, and reset with a recovery copy', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  await da.storage.setRaw('sync', 'providerConfig', CORRUPT_PROVIDER_CONFIG)
  await expect(da.runtime.runUpgrade()).rejects.toThrow(/providerConfig/)

  const popup = await Popup.open(page, extensionId)
  await expect(popup.optionsUpgrade.failedStore('providerConfig')).toHaveText(
    /^(Sources|弹幕源).+(cannot convert|无法被此版本转换)/
  )
  expect(await da.storage.get('sync', 'providerConfig')).toEqual(
    CORRUPT_PROVIDER_CONFIG
  )

  const download = page.waitForEvent('download')
  await popup.optionsUpgrade.resetButton('providerConfig').click()
  await popup.dialog.confirm()
  const recoveryFile = await download

  expect(recoveryFile.suggestedFilename()).toMatch(
    /^danmaku-anywhere-providerConfig-recovery-\d{4}-\d{2}-\d{2}\.json$/
  )
  const copy = JSON.parse(await fs.readFile(await recoveryFile.path(), 'utf-8'))
  expect(copy).toMatchObject({
    store: 'providerConfig',
    items: { providerConfig: CORRUPT_PROVIDER_CONFIG },
  })
  await popup.optionsUpgrade.expectUpgraded()
  expect(await da.storage.get('sync', 'providerConfig')).toMatchObject({
    version: LATEST_PROVIDER_CONFIG_VERSION,
  })
})
