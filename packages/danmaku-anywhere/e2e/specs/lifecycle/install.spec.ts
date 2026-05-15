import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'

/**
 * Fresh-install smoke for the extension. Asserts the SW registers, the
 * onInstalled upgrade path seeds default extensionOptions plus the three
 * built-in provider configs, and no console errors fire during boot.
 *
 * A chrome.runtime.reload() variant was intentionally dropped: under
 * Playwright's --load-extension launch, the extension does not respawn
 * after runtime.reload(), so the case isn't exercisable here.
 */

const BUILTIN_PROVIDER_IDS = [
  'builtin:dandanplay',
  'builtin:bilibili',
  'builtin:tencent',
] as const

test('fresh install: default options seeded, no console errors', async ({
  context,
  extensionId,
  consoleErrors,
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
  for (const p of providers) {
    expect(p.isBuiltIn).toBe(true)
  }

  expect(consoleErrors()).toEqual([])
})
