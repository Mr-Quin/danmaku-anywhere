import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The generic provider config editor renders fields from the manifest's
 * configSchema (text, select, nested objects) instead of hand-written per
 * provider forms. Drives the editor for a custom DanDanPlay-compatible server
 * and the built-in Bilibili provider, asserting the schema-driven fields show,
 * a save toast appears, and the edited values land in stored configValues.
 * Also asserts the schema's `required` constraint blocks saving an empty
 * auth header until it is filled. Field titles localize with the UI language,
 * so they are matched against both the English source and the zh override.
 */

const NAV_URL = /api\.bilibili\.com\/x\/web-interface\/nav/

const customDdp: ProviderConfig = {
  id: 'custom-ddp-form',
  manifestId: 'dandanplay',
  name: 'My DDP Server',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  configValues: {
    baseUrl: '',
    auth: { enabled: false, headers: [] },
  },
}

test('renders configSchema fields and saves a custom DanDanPlay server', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [customDdp] })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('My DDP Server')

  await popup.providers.expectFieldVisible(/Base URL|基础地址/)
  await popup.providers.expectFieldVisible(/Chinese conversion|中文转换/)

  await popup.providers.fillField(
    /Base URL|基础地址/,
    'https://compat.example.invalid'
  )
  await popup.providers.selectOption(/Chinese conversion|中文转换/, '2')
  await popup.providers.save()

  await popup.toast.expectSuccess(/Provider updated|弹幕源已更新/)

  const saved = await da.providerConfig.get('custom-ddp-form')
  expect(saved?.configValues.baseUrl).toBe('https://compat.example.invalid')
  expect(saved?.configValues.chConvert).toBe(2)
})

test('enforces the schema required constraint on auth headers', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, { customProviders: [customDdp] })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit('My DDP Server')

  await popup.providers.addArrayItem()
  await popup.providers.save()

  await expect(popup.providers.field(/Header name|请求头名称/)).toHaveAttribute(
    'aria-invalid',
    'true'
  )

  await popup.providers.fillField(/Header name|请求头名称/, 'X-Token')
  await popup.providers.fillField(/Value|值/, 'secret')
  await popup.providers.save()

  await popup.toast.expectSuccess(/Provider updated|弹幕源已更新/)

  const saved = await da.providerConfig.get('custom-ddp-form')
  expect(saved?.configValues.auth).toMatchObject({
    headers: [{ key: 'X-Token', value: 'secret' }],
  })
})

test('edits the built-in Bilibili provider via the generic form', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: [
      {
        pattern: NAV_URL,
        respond: (route) =>
          route.fulfill({
            json: { code: 0, message: '0', data: { isLogin: true } },
          }),
      },
    ],
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit(/Bilibili|B站/)

  await popup.providers.expectFieldVisible(/Danmaku format|弹幕格式/)
  await expect(popup.providers.nameField()).toBeEnabled()

  await popup.providers.nameField().fill('Bilibili Custom')
  await popup.providers.selectOption(/Danmaku format|弹幕格式/, 'protobuf')
  await popup.providers.save()

  await popup.toast.expectSuccess(/Provider updated|弹幕源已更新/)

  const saved = await da.providerConfig.get('bilibili')
  expect(saved?.name).toBe('Bilibili Custom')
  expect(saved?.configValues.danmakuFormat).toBe('protobuf')
})
