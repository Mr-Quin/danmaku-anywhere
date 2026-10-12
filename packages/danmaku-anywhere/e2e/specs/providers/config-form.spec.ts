import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { mockLoginProbes } from '../../network/loginProbes'
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
 * auth header until it is filled, and that configSchema constraints
 * (format: uri, minimum) surface as field errors and block saving until
 * the values are fixed. Field titles localize with the UI language,
 * so they are matched against both the English source and the zh override.
 * A labelled enum (oneOf const/title) lists its titles, not the raw values.
 * The built-in DanDanPlay hides its server and credential fields behind a
 * note, which a built-in without a server field does not show, and its
 * editor fits the popup without a sideways scrollbar.
 * Finally, a provider whose manifest spec fails to load shows an error with a
 * retry action instead of a stripped name-only form that would drop its config.
 */

const customDdp: ProviderConfig = {
  id: 'custom-ddp-form',
  manifestId: 'dandanplay',
  name: 'My DDP Server',
  enabled: true,
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
  await popup.providers.expectFieldVisible(
    /Chinese conversion|中文转换|简繁转换/
  )

  await popup.providers.fillField(
    /Base URL|基础地址/,
    'https://compat.example.invalid'
  )
  await popup.providers.selectOption(
    /Chinese conversion|中文转换|简繁转换/,
    /^(2|Convert to traditional|转换成繁体)$/
  )
  await popup.providers.save()

  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

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
  await applyProfile(context, da, {
    customProviders: [
      {
        ...customDdp,
        configValues: {
          ...customDdp.configValues,
          baseUrl: 'https://compat.example.invalid',
        },
      },
    ],
  })

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

  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

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
    network: mockLoginProbes(),
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit(/Bilibili|B站/)

  await popup.providers.expectFieldVisible(/Danmaku format|弹幕格式/)
  await expect(popup.providers.nameField()).toBeEnabled()
  await expect(page.getByText(BUILTIN_SERVER_NOTE)).toHaveCount(0)

  await popup.providers.nameField().fill('Bilibili Custom')
  await popup.providers.selectOption(
    /Danmaku format|弹幕格式/,
    /^(protobuf|Protobuf.*)$/
  )
  await popup.providers.save()

  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

  const saved = await da.providerConfig.get('bilibili')
  expect(saved?.name).toBe('Bilibili Custom')
  expect(saved?.configValues.danmakuFormat).toBe('protobuf')
})

const BUILTIN_SERVER_NOTE =
  /server of a built-in source cannot be changed|内置弹幕源的服务器设置不能修改/

test('hides the server and credential fields of the built-in DanDanPlay', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit(/\((Built-in|内置)\)/)

  await popup.providers.expectFieldVisible(
    /Chinese conversion|中文转换|简繁转换/
  )
  await expect(page.getByText(BUILTIN_SERVER_NOTE)).toBeVisible()
  for (const hidden of [
    /Base URL|基础地址/,
    /App ID|应用 ID/,
    /App Secret|应用密钥/,
    /Enable auth headers|启用鉴权请求头/,
  ]) {
    await expect(popup.providers.field(hidden)).toHaveCount(0)
  }
  await expect(page.getByText(/^(Headers|请求头)$/)).toHaveCount(0)
})

test('the built-in DanDanPlay editor does not scroll sideways', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.edit(/\((Built-in|内置)\)/)
  await expect(page.getByText(BUILTIN_SERVER_NOTE)).toBeVisible()

  const sidewaysScrollers = await page.evaluate(() => {
    return [...document.querySelectorAll('body *')].filter((el) => {
      const { overflowX } = getComputedStyle(el)
      const scrolls = overflowX === 'auto' || overflowX === 'scroll'
      return scrolls && el.scrollWidth > el.clientWidth + 1
    }).length
  })
  expect(sidewaysScrollers).toBe(0)
})

const labelledManifest = {
  apiVersion: 1,
  id: 'user:labelled-source',
  name: 'Labelled Source',
  version: '1.0.0',
  hosts: ['example.com'],
  configSchema: {
    type: 'object',
    properties: {
      convert: {
        type: 'integer',
        title: 'Conversion',
        enum: [0, 1, 2],
        oneOf: [
          { const: 0, title: 'No conversion' },
          { const: 1, title: 'To simplified' },
          { const: 2, title: 'To traditional' },
        ],
        default: 0,
      },
    },
  },
  locales: {
    'zh-CN': {
      'configSchema.properties.convert.title': '转换',
      'configSchema.properties.convert.oneOf.2.title': '转为繁体',
    },
  },
}

test('lists labelled enum options by their titles', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.authorManifest()
  await popup.providers.setManifestJson(JSON.stringify(labelledManifest))
  await expect(popup.providers.manifestValid()).toBeVisible()
  await popup.providers.save()
  await popup.toast.expectSuccess(/Manifest saved|清单已保存/)

  await popup.providers.edit('Labelled Source')
  await expect(popup.providers.field(/Conversion|转换/)).toHaveText(
    'No conversion'
  )
  await popup.providers.selectOption(
    /Conversion|转换/,
    /^(To traditional|转为繁体)$/
  )
  await popup.providers.save()
  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

  const saved = (await da.providerConfig.list()).find(
    (config) => config.manifestId === 'user:labelled-source'
  )
  expect(saved?.configValues.convert).toBe(2)
})

// Authored through the manifest editor because no bundled manifest carries
// constraint keywords. Required fields are avoided: the editor rejects
// required-without-default manifests at save.
const constrainedManifest = {
  apiVersion: 1,
  id: 'user:constrained-source',
  name: 'Constrained Source',
  version: '1.0.0',
  hosts: ['example.com'],
  identityFields: ['baseUrl'],
  configSchema: {
    type: 'object',
    properties: {
      baseUrl: { type: 'string', format: 'uri', title: 'Base URL' },
      limit: {
        type: 'integer',
        title: 'Limit',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    },
  },
}

test('enforces configSchema constraints before saving config values', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')
  await popup.providers.authorManifest()
  await popup.providers.setManifestJson(JSON.stringify(constrainedManifest))
  await expect(popup.providers.manifestValid()).toBeVisible()
  await popup.providers.save()
  await popup.toast.expectSuccess(/Manifest saved|清单已保存/)

  await popup.providers.edit('Constrained Source')
  await popup.providers.fillField('Base URL', 'not a url')
  await popup.providers.fillField('Limit', '0')
  await popup.providers.save()

  await expect(page.getByText(/Not a valid URL|不是有效的 URL/)).toBeVisible()
  await expect(page.getByText(/Must be at least 1|不能小于 1/)).toBeVisible()

  const blocked = (await da.providerConfig.list()).find(
    (config) => config.manifestId === 'user:constrained-source'
  )
  expect(blocked?.configValues.baseUrl).toBe('')
  expect(blocked?.configValues.limit).toBe(10)

  await popup.providers.fillField(
    'Base URL',
    'https://constrained.example.invalid'
  )
  await popup.providers.fillField('Limit', '50')
  await popup.providers.save()

  await popup.toast.expectSuccess(/Source updated|弹幕源已更新/)

  const saved = (await da.providerConfig.list()).find(
    (config) => config.manifestId === 'user:constrained-source'
  )
  expect(saved?.configValues).toMatchObject({
    baseUrl: 'https://constrained.example.invalid',
    limit: 50,
  })
})

const orphanedProvider: ProviderConfig = {
  id: 'orphaned-source',
  manifestId: 'manifest-that-failed-to-load',
  name: 'Orphaned Source',
  enabled: true,
  configValues: {
    baseUrl: 'https://orphaned.example.invalid',
    auth: { enabled: false, headers: [] },
  },
}

test.describe('manifest spec load failure', () => {
  // Editing a provider whose manifest is unregistered rejects the spec RPC; the
  // service worker logs that rejection.
  test.use({
    expectedConsoleErrors: [
      /\[RpcManager\] Error in RPC handler.*no manifest registered/,
    ],
  })

  test('shows an error with retry instead of a stripped form', async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    await applyProfile(context, da, { customProviders: [orphanedProvider] })

    const popup = await Popup.open(page, extensionId, '/providers')
    await popup.providers.edit('Orphaned Source')

    await expect(
      page.getByText(/Failed to load provider settings|加载弹幕源设置失败/)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^(Retry|重试)$/ })
    ).toBeVisible()

    await expect(popup.providers.nameField()).toBeHidden()
    await expect(popup.providers.saveButton()).toBeHidden()
  })
})
