import {
  DanmakuSourceType,
  PROVIDER_TO_BUILTIN_ID,
} from '@danmaku-anywhere/danmaku-converter'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Fresh-install smoke. Asserts the SW registers, onInstalled seeds default
 * extensionOptions + the three built-in provider configs, no console errors.
 *
 * A runtime.reload() variant was dropped — under --load-extension, the
 * extension does not respawn after reload, so the case isn't exercisable.
 */

const BUILTIN_PROVIDER_IDS = [
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.DanDanPlay],
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Bilibili],
  PROVIDER_TO_BUILTIN_ID[DanmakuSourceType.Tencent],
] as const

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

  const providers = await da.providerConfig.list()
  const ids = providers.map((p) => p.id).sort()
  expect(ids).toEqual([...BUILTIN_PROVIDER_IDS].sort())
})
