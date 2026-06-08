import {
  DanmakuSourceType,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Fresh-install smoke. Asserts the SW registers, onInstalled seeds default
 * extensionOptions, and the three preloaded provider configs are seeded after
 * the manifest catalog loads with names derived from the manifest (so they
 * localize): the default UI language is Chinese, so the seeded names are the
 * manifests' zh strings, not hardcoded English. No console errors.
 *
 * A runtime.reload() variant was dropped: under --load-extension, the
 * extension does not respawn after reload, so the case isn't exercisable.
 */

const BUILTIN_PROVIDER_IDS = [
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
] as const

// The manifests' zh-CN display names; the default UI language is Chinese.
const LOCALIZED_NAMES_BY_ID: Record<string, string> = {
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay]]: '弹弹play',
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili]]: 'B站',
  [PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent]]: '腾讯视频',
}

test('fresh install: default options seeded, no console errors', async ({
  context,
  extensionId,
}) => {
  // Chrome extension IDs are a 32-char base-16 alphabet of a-p.
  expect(extensionId).toMatch(/^[a-p]{32}$/)

  const da = await getDaClient(context)

  const options = await da.extensionOptions.get()
  expect(options.enabled).toBe(true)
  expect(options.hotkeys).toBeTruthy()
  expect(options.theme).toBeTruthy()

  // Seeding happens after the catalog loads (a network round-trip), so poll
  // until the preloaded set lands rather than reading once.
  await expect
    .poll(async () => {
      const providers = await da.providerConfig.list()
      return providers.map((p) => p.id).sort()
    })
    .toEqual([...BUILTIN_PROVIDER_IDS].sort())

  const providers = await da.providerConfig.list()
  for (const provider of providers) {
    expect(provider.name).toBe(LOCALIZED_NAMES_BY_ID[provider.id])
  }
})
