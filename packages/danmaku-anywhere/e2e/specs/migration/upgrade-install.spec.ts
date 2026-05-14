import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/network'
import { applyProfile } from '../../setup/profile'

// Locks down the v21 migration that splits legacy `danmakuSources` out of
// extensionOptions into a separate `providerConfig` storage key.
//
// Approach:
//   1. seed sync.extensionOptions with a v20-shaped blob (legacy nested
//      danmakuSources)
//   2. call da.runtime.runUpgrade() to exercise the full version chain
//      (NOT chrome.runtime.reload — that doesn't refire onInstalled with
//      reason 'update' for same-version reloads)
//   3. assert providerConfig now contains the three built-ins
//   4. confirm the popup loads without crash
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

  await page.goto(`chrome-extension://${extensionId}/pages/popup.html`)
  await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 })
})
