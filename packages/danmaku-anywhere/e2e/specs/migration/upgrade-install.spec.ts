import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

test('upgrade install: pre-v21 storage migrates and popup opens', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    rawStorage: [
      {
        area: 'sync',
        key: 'extensionOptions',
        value: loadJsonFixture('legacy-extension-options-v20.json'),
      },
    ],
    // chrome.runtime.reload() does NOT fire onInstalled('update') for a
    // same-version reload, so we trigger the upgrade chain directly.
    runUpgrade: true,
  })

  const providerConfig = (await da.storage.get('sync', 'providerConfig')) as {
    data: Array<{ id: string }>
    version: number
  } | null
  if (!providerConfig) {
    throw new Error('providerConfig storage was not populated by migration')
  }
  expect(providerConfig.data).toBeInstanceOf(Array)
  const ids = providerConfig.data.map((p) => p.id)
  expect(ids).toEqual(
    expect.arrayContaining([
      'builtin:dandanplay',
      'builtin:bilibili',
      'builtin:tencent',
    ])
  )

  await Popup.open(page, extensionId, '/')
})
