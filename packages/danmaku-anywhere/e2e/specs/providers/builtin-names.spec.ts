import { Language } from '../../../src/common/localization/language'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Built-ins are seeded with names in the install's language. With the UI in
 * English, built-ins still carrying their Chinese seed names show the English
 * manifest names on the Sources page, while a renamed built-in keeps the
 * user's name. The stored names are left as they were.
 */

function builtin(
  id: string,
  name: string,
  configValues: Record<string, unknown> = {}
): ProviderConfig {
  return { id, manifestId: id, name, enabled: true, configValues }
}

test('shows zh-seeded built-in names in English for an English UI', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.en },
    network: mockLoginProbes(),
  })
  const stored = [
    builtin('dandanplay', '弹弹play', {
      baseUrl: 'https://proxy.test.invalid/ddp',
    }),
    builtin('bilibili', 'B站', { danmakuFormat: 'xml' }),
    builtin('tencent', 'My Tencent'),
  ]
  await da.providerConfig.set(stored)

  const popup = await Popup.open(page, extensionId, '/providers')

  await expect(popup.providers.row('DanDanPlay (Built-in)')).toBeVisible()
  await expect(popup.providers.row('Bilibili')).toBeVisible()
  await expect(popup.providers.row('My Tencent')).toBeVisible()
  await expect(page.getByText(/弹弹play|B站/)).toHaveCount(0)

  const names = (await da.providerConfig.list()).map((config) => config.name)
  expect(names).toEqual(['弹弹play', 'B站', 'My Tencent'])
})
