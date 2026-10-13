import { Language } from '../../../src/common/localization/language'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockLoginProbes } from '../../network/loginProbes'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * A source on its default name shows its manifest name in the UI language,
 * while a name the user typed stays as typed in every language, even when it
 * matches a default name. Saving an edit to a built-in keeps it on its default
 * name, and clearing a custom name returns the source to its default.
 */

function builtin(
  id: string,
  customName: string | null,
  configValues: Record<string, unknown> = {}
): ProviderConfig {
  return { id, manifestId: id, customName, enabled: true, configValues }
}

const builtins = [
  builtin('dandanplay', null, { baseUrl: 'https://proxy.test.invalid/ddp' }),
  builtin('bilibili', null, { danmakuFormat: 'xml' }),
  builtin('tencent', 'My Tencent'),
]

test('shows default names in the UI language and custom names as typed', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.en },
    network: mockLoginProbes(),
  })
  await da.providerConfig.set(builtins)

  const popup = await Popup.open(page, extensionId, '/providers')
  await expect(popup.providers.row('DanDanPlay (Built-in)')).toBeVisible()
  await expect(popup.providers.row('Bilibili')).toBeVisible()
  await expect(popup.providers.row('My Tencent')).toBeVisible()

  await da.extensionOptions.update({ lang: Language.zh })
  await page.reload()

  await expect(popup.providers.row('弹弹play (内置)')).toBeVisible()
  await expect(popup.providers.row('B站')).toBeVisible()
  await expect(popup.providers.row('My Tencent')).toBeVisible()
})

test('keeps a built-in on its default name when another setting is saved', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.zh },
    network: mockLoginProbes(),
  })
  await da.providerConfig.set(builtins)

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('B站')
  await popup.providers.selectOption('弹幕格式', /^Protobuf/)
  await popup.providers.save()
  await popup.toast.expectSuccess('弹幕源已更新')

  await da.extensionOptions.update({ lang: Language.en })
  await page.reload()

  await expect(popup.providers.row('Bilibili')).toBeVisible()
  await expect(page.getByText('B站')).toHaveCount(0)
  const saved = await da.providerConfig.get('bilibili')
  expect(saved?.customName).toBeNull()
  expect(saved?.configValues.danmakuFormat).toBe('protobuf')
})

test('keeps a typed name that matches a default name in every language', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.en },
    network: mockLoginProbes(),
  })
  await da.providerConfig.set(builtins)

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('Bilibili')
  await popup.providers.nameField().fill('Bilibili')
  await popup.providers.save()
  await popup.toast.expectSuccess('Source updated')

  await da.extensionOptions.update({ lang: Language.zh })
  await page.reload()

  await expect(popup.providers.row('Bilibili')).toBeVisible()
  await expect(page.getByText('B站')).toHaveCount(0)
})

test('returns a renamed source to its default name when the name is cleared', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    extensionOptions: { lang: Language.en },
    network: mockLoginProbes(),
  })
  await da.providerConfig.set(builtins)

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('My Tencent')
  await expect(popup.providers.nameField()).toHaveAttribute(
    'placeholder',
    'Tencent Video'
  )
  await popup.providers.nameField().fill('')
  await popup.providers.save()
  await popup.toast.expectSuccess('Source updated')

  await expect(popup.providers.row('Tencent Video')).toBeVisible()
  expect((await da.providerConfig.get('tencent'))?.customName).toBeNull()
})
